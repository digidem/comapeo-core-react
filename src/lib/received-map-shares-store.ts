import type { MapShare } from '@comapeo/core'
import type { MapeoClientApi } from '@comapeo/ipc'
import type { MapShareState as ServerMapShareState } from '@comapeo/map-server'
import ensureError from 'ensure-error'
import type { DistributedOmit, SharedUnionFields, Simplify } from 'type-fest'

import type { MapServerApi } from '../contexts/MapServer.js'

type DistributedIntersection<T, U> = U extends unknown ? Simplify<T & U> : never
export type ReceivedMapShareState = DistributedIntersection<
	Simplify<MapShare>,
	ServerMapShareState
>
type MapShareStateUpdate = Simplify<
	DistributedOmit<
		ReceivedMapShareState,
		Exclude<keyof SharedUnionFields<ReceivedMapShareState>, 'status'>
	>
>
export type ReceivedMapSharesStore = ReturnType<
	typeof createReceivedMapSharesStore
>

/**
 * This is like a mini zustand store. Keeping the map shares in an external
 * store avoids unnecessary re-renders of the entire app when map shares are
 * updated (e.g. if we kept the state in the context), and it avoids potential
 * tearing issues with concurrent rendering.
 */
export function createReceivedMapSharesStore({
	clientApi,
	mapServerApi,
}: {
	clientApi: MapeoClientApi
	mapServerApi: MapServerApi
}) {
	let mapShares: Array<ReceivedMapShareState> = []
	const listeners = new Set<() => void>()
	const downloads = new Map<string, Promise<string | void>>()

	clientApi.on('map-share', (mapShare: MapShare) => {
		mapShares = [...mapShares, { ...mapShare, status: 'pending' }]
		emit()
	})

	function update(mapShareId: string, stateUpdate: MapShareStateUpdate) {
		mapShares = mapShares.map((mapShare) => {
			if (mapShare.shareId !== mapShareId) return mapShare
			assertValidStatusTransition(mapShare.status, stateUpdate.status)
			return { ...mapShare, ...stateUpdate }
		})
		emit()
	}

	function getMapShare(mapShareId: string) {
		const mapShare = mapShares.find((share) => share.shareId === mapShareId)
		if (!mapShare) {
			throw new Error(`Map share with id ${mapShareId} not found`)
		}
		return mapShare
	}

	function handleError(mapShareId: string, cause: unknown) {
		const error = ensureError(cause)
		const errorCode = 'code' in error ? String(error.code) : 'UNKNOWN_ERROR'
		try {
			update(mapShareId, {
				status: 'error',
				error: {
					message: error.message,
					code: errorCode,
				},
			})
		} catch {
			// TODO: log errors
		}
	}

	function monitorDownload(mapShareId: string, downloadId: string) {
		// TODO: add a timeout in case the download stalls and never completes
		const es = mapServerApi.createEventSource({
			url: `downloads/${downloadId}/events`,
			onMessage({ data }) {
				try {
					const stateUpdate = JSON.parse(data)
					update(mapShareId, stateUpdate)
				} catch (cause) {
					es.close()
					handleError(mapShareId, cause)
				}
			},
		})
	}

	function emit() {
		listeners.forEach((l) => l())
	}

	return {
		subscribe(listener: () => void) {
			listeners.add(listener)
			return () => listeners.delete(listener)
		},
		getSnapshot() {
			return mapShares
		},
		async download(mapShareId: string) {
			const mapShare = getMapShare(mapShareId)
			update(mapShareId, { status: 'downloading', bytesDownloaded: 0 })
			try {
				const downloadIdPromise = mapServerApi
					.post(`downloads`, {
						json: {
							senderDeviceId: mapShare.senderDeviceId,
							shareId: mapShare.shareId,
							mapShareUrls: mapShare.mapShareUrls,
							estimatedSizeBytes: mapShare.estimatedSizeBytes,
						},
					})
					.json<{ downloadId: string }>()
					.then(({ downloadId }) => downloadId)
				// Not strictly necessary, because the `await downloadIdPromise` in the
				// same tick below ensures that this is handled, but this protects
				// against a refactor which could add another async function between
				// setting the promise on the map and awaiting the downloadIdPromise,
				// which would result in an unhandled rejection without this.
				downloadIdPromise.catch(noop)
				downloads.set(mapShareId, downloadIdPromise)
				monitorDownload(mapShareId, await downloadIdPromise)
			} catch (cause) {
				downloads.delete(mapShareId)
				handleError(mapShareId, cause)
				throw cause
			}
		},
		async decline(mapShareId: string, reason: string) {
			const mapShare = getMapShare(mapShareId)
			update(mapShareId, { status: 'declined', reason })
			try {
				await mapServerApi.post(`mapShares/${mapShareId}/decline`, {
					json: {
						senderDeviceId: mapShare.senderDeviceId,
						mapShareUrls: mapShare.mapShareUrls,
						reason,
					},
				})
			} catch (cause) {
				handleError(mapShareId, cause)
				throw cause
			}
		},
		async abort(mapShareId: string) {
			getMapShare(mapShareId) // Throws if share doesn't exist
			update(mapShareId, { status: 'aborted' })
			try {
				const downloadId = await downloads.get(mapShareId)
				if (!downloadId) {
					throw new Error(
						`No download in progress for map share with id ${mapShareId}`,
					)
				}
				await mapServerApi.post(`downloads/${downloadId}/abort`)
			} catch (cause) {
				handleError(mapShareId, cause)
				throw cause
			} finally {
				downloads.delete(mapShareId)
			}
		},
	}
}

const allowedStatusTransitions: Record<
	ReceivedMapShareState['status'],
	Array<ReceivedMapShareState['status']>
> = {
	pending: ['downloading', 'declined', 'error'],
	downloading: ['downloading', 'aborted', 'completed', 'canceled', 'error'],
	completed: ['error'],
	canceled: ['error'],
	aborted: ['error'],
	declined: ['error'],
	error: ['error'],
}

function assertValidStatusTransition(
	current: ReceivedMapShareState['status'],
	next: ReceivedMapShareState['status'],
) {
	if (!allowedStatusTransitions[current].includes(next)) {
		throw new Error(`Invalid status transition from ${current} to ${next}`)
	}
}

function noop() {}

import type { MapShare } from '@comapeo/core'
import type { MapeoClientApi } from '@comapeo/ipc'
import type { MapShareState as ServerMapShareState } from '@comapeo/map-server'
import ensureError from 'ensure-error'
import type { DistributedOmit, SharedUnionFields, Simplify } from 'type-fest'

import type { MapServerApi } from '../contexts/MapServer.js'

type DistributedIntersection<T, U> = U extends unknown ? Simplify<T & U> : never
type MapShareState = DistributedIntersection<
	Simplify<MapShare>,
	ServerMapShareState
>
type MapShareStateUpdate = Simplify<
	DistributedOmit<
		MapShareState,
		Exclude<keyof SharedUnionFields<MapShareState>, 'status'>
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
	let mapShares: Array<MapShareState> = []
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
			url: `/download/${downloadId}/events`,
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
		download(mapShareId: string) {
			const mapShare = getMapShare(mapShareId)
			update(mapShareId, { status: 'downloading', bytesDownloaded: 0 })
			const downloadId = (async () => {
				const { downloadId } = await mapServerApi
					.post(`/mapShares/${mapShareId}/download`, {
						json: {
							senderDeviceId: mapShare.senderDeviceId,
							shareId: mapShare.shareId,
							mapShareUrls: mapShare.mapShareUrls,
							estimatedSizeBytes: mapShare.estimatedSizeBytes,
						},
					})
					.json<{ downloadId: string }>()
				monitorDownload(mapShareId, downloadId)
				return downloadId
			})().catch((cause: unknown) => {
				downloads.delete(mapShareId)
				handleError(mapShareId, cause)
			})
			downloads.set(mapShareId, downloadId)
		},
		decline(mapShareId: string, reason: string) {
			const mapShare = getMapShare(mapShareId)
			update(mapShareId, { status: 'declined', reason })
			mapServerApi
				.post(`/mapShares/${mapShareId}/decline`, {
					json: {
						senderDeviceId: mapShare.senderDeviceId,
						mapShareUrls: mapShare.mapShareUrls,
						reason,
					},
				})
				.catch((cause: unknown) => handleError(mapShareId, cause))
		},
		abort(mapShareId: string) {
			const mapShare = getMapShare(mapShareId)
			update(mapShareId, { status: 'aborted' })
			;(async () => {
				const downloadId = await downloads.get(mapShareId)
				if (!downloadId) {
					throw new Error(
						`No download in progress for map share with id ${mapShareId}`,
					)
				}
				await mapServerApi.post(`/mapShares/${mapShareId}/abort`, {
					json: {
						senderDeviceId: mapShare.senderDeviceId,
						mapShareUrls: mapShare.mapShareUrls,
					},
				})
			})()
				.catch((cause: unknown) => handleError(mapShareId, cause))
				.finally(() => {
					downloads.delete(mapShareId)
				})
		},
	}
}

const allowedStatusTransitions: Record<
	MapShareState['status'],
	Array<MapShareState['status']>
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
	current: MapShareState['status'],
	next: MapShareState['status'],
) {
	if (!allowedStatusTransitions[current].includes(next)) {
		throw new Error(`Invalid status transition from ${current} to ${next}`)
	}
}

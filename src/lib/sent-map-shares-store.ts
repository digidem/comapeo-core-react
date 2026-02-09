import type { MapShare } from '@comapeo/core'
import type { MapeoClientApi } from '@comapeo/ipc'
import type { MapShareState } from '@comapeo/map-server'
import ensureError from 'ensure-error'
import type { DistributedOmit, SharedUnionFields, Simplify } from 'type-fest'

import type { MapServerApi } from '../contexts/MapServer.js'

export type SentMapShareState = MapShareState
type MapShareStateUpdate = Simplify<
	DistributedOmit<
		SentMapShareState,
		Exclude<keyof SharedUnionFields<SentMapShareState>, 'status'>
	>
>
export type SentMapSharesStore = ReturnType<typeof createSentMapSharesStore>

/**
 * This is like a mini zustand store. Keeping the map shares in an external
 * store avoids unnecessary re-renders of the entire app when map shares are
 * updated (e.g. if we kept the state in the context), and it avoids potential
 * tearing issues with concurrent rendering.
 */
export function createSentMapSharesStore({
	clientApi,
	mapServerApi,
}: {
	clientApi: MapeoClientApi
	mapServerApi: MapServerApi
}) {
	let mapShares: Array<MapShareState> = []
	const listeners = new Set<() => void>()

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

	function monitorMapShare(mapShareId: string) {
		const es = mapServerApi.createEventSource({
			url: `mapShares/${mapShareId}/events`,
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

		async create({
			projectId,
			receiverDeviceId,
			mapId,
		}: Pick<MapShare, 'receiverDeviceId' | 'mapId'> & { projectId: string }) {
			const mapShare = await mapServerApi
				.post('mapShares', {
					json: { receiverDeviceId, mapId },
				})
				.json<MapShareState>()
			const project = await clientApi.getProject(projectId)
			await project.$sendMapShare(
				// TODO fix up types on this in @comapeo/core so we don't have to cast
				mapShare as unknown as Omit<
					MapShareState,
					'mapShareUrls' | 'bounds'
				> & { mapShareUrls: Array<string>; bounds: Array<number> },
			)
			mapShares.push(mapShare)
			emit()
			monitorMapShare(mapShare.shareId)
		},

		async cancel(mapShareId: string) {
			getMapShare(mapShareId) // Throws if share doesn't exist
			update(mapShareId, { status: 'canceled' })
			try {
				await mapServerApi.post(`mapShares/${mapShareId}/cancel`)
			} catch (cause) {
				handleError(mapShareId, cause)
				throw cause
			}
		},
	}
}

const allowedStatusTransitions: Record<
	MapShareState['status'],
	Array<MapShareState['status']>
> = {
	pending: ['pending', 'downloading', 'declined', 'canceled', 'error'],
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

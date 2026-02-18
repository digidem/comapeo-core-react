/* eslint-disable no-ex-assign */
import type { MapShare } from '@comapeo/core'
import type { MapeoClientApi } from '@comapeo/ipc'
import { type MapShareState as ServerMapShareState } from '@comapeo/map-server'
import { CUSTOM_MAP_ID } from '@comapeo/map-server/constants.js'
import { errors } from '@comapeo/map-server/errors.js'
import { type QueryClient } from '@tanstack/react-query'
import ensureError from 'ensure-error'
import { isHTTPError } from 'ky'
import type { DistributedOmit, SharedUnionFields, Simplify } from 'type-fest'

import type { MapServerApi } from '../contexts/MapServer.js'
import { invalidateMapQueries } from './react-query/maps.js'

type DistributedIntersection<T, U> = U extends unknown ? Simplify<T & U> : never
export type ReceivedMapShareState = DistributedIntersection<
	Simplify<MapShare>,
	ServerMapShareState
>
export type SentMapShareState = ServerMapShareState
type MapShareStateUpdate = Simplify<
	DistributedOmit<
		ServerMapShareState,
		Exclude<keyof SharedUnionFields<ServerMapShareState>, 'status'>
	>
>
type MapShareStatus = ServerMapShareState['status']
export type ReceivedMapSharesStore = ReturnType<
	typeof createReceivedMapSharesStore
>
export type SentMapSharesStore = ReturnType<typeof createSentMapSharesStore>

// ============================================
// ACTION OPTIONS TYPES
// These are defined here so that VSCode tooltips work for the mutation
// functions - if the documentation comments are added inline for the store
// actions, they do not show for the mutate() function in hooks.
// ============================================

/** Known reasons for declining a map share */
export const DeclineReason = {
	/** User explicitly rejected the map share */
	user_rejected: 'user_rejected',
	/** Device storage is full */
	storage_full: 'storage_full',
} as const

/** Options for downloading a received map share */
export type DownloadMapShareOptions = {
	/** ID of the map share to download */
	shareId: string
}

/** Options for declining a received map share */
export type DeclineMapShareOptions = {
	/** ID of the map share to decline */
	shareId: string
	/** Reason for declining (e.g., 'user_rejected', 'storage_full') */
	reason: (typeof DeclineReason)[keyof typeof DeclineReason] | (string & {})
}

/** Options for aborting an in-progress map share download */
export type AbortMapShareOptions = {
	/** ID of the map share download to abort */
	shareId: string
}

/** Options for creating and sending a map share */
export type CreateAndSendMapShareOptions = {
	/** Public ID of the project to send the share on behalf of */
	projectId: string
	/** Device ID of the recipient */
	receiverDeviceId: string
	/** ID of the map to share - not needed until we support multiple maps */
	mapId?: string
}

/** Options for canceling a sent map share */
export type CancelMapShareOptions = {
	/** ID of the map share to cancel */
	shareId: string
}

/**
 * This is like a mini zustand store. Keeping the map shares in an external
 * store avoids unnecessary re-renders of the entire app when map shares are
 * updated (e.g. if we kept the state in the context), and it avoids potential
 * tearing issues with concurrent rendering.
 *
 * This is the base store for both sent and received map shares, since they
 * share a lot of logic around managing the map shares and monitoring their
 * status.
 */
function createMapSharesStore<
	TMapShare extends DistributedIntersection<
		MapShareStateUpdate,
		{ shareId: MapShare['shareId'] }
	>,
>({ mapServerApi }: { mapServerApi: MapServerApi }) {
	let mapShares: Array<TMapShare> = []
	const listeners = new Set<() => void>()

	function update(shareId: string, stateUpdate: MapShareStateUpdate) {
		const index = mapShares.findIndex((s) => s.shareId === shareId)
		const existing = mapShares[index]
		if (!existing) {
			throw new errors.MAP_SHARE_NOT_FOUND(
				`Map share with id ${shareId} not found`,
			)
		}
		assertValidStatusTransition(existing.status, stateUpdate.status)
		mapShares[index] = { ...existing, ...stateUpdate }
		const isDownloadProgressUpdate =
			stateUpdate.status === 'downloading' && existing.status === 'downloading'
		// IMPORTANT: For download progress updates, the store state is mutated, so
		// maintains Object.is equality. This means that components listening to the
		// store state without a selector _will not update_ when download progress
		// updates. However, all other updates will result in a re-render, and using
		// a selector to listen to an individual map share will also update during
		// download progress.
		if (!isDownloadProgressUpdate) {
			mapShares = [...mapShares]
		}
		emit()
	}

	function add(mapShare: TMapShare) {
		mapShares = [...mapShares, mapShare]
		emit()
	}

	function get(shareId: string) {
		const mapShare = mapShares.find((share) => share.shareId === shareId)
		if (!mapShare) {
			throw new errors.MAP_SHARE_NOT_FOUND(
				`Map share with id ${shareId} not found`,
			)
		}
		return mapShare
	}

	function handleError(shareId: string, cause: unknown) {
		const error = ensureError(cause)
		const errorCode = 'code' in error ? String(error.code) : 'UNKNOWN_ERROR'
		try {
			update(shareId, {
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

	async function monitor(mapShareId: string, path: string) {
		// TODO: add a timeout in case the download stalls and never completes
		return new Promise<MapShareStateUpdate>((resolve, reject) => {
			const es = mapServerApi.createEventSource({
				url: path,
				onMessage({ data }) {
					try {
						const stateUpdate = JSON.parse(data)
						update(mapShareId, stateUpdate)
						if (isFinalStatus(stateUpdate.status)) {
							es.close()
							resolve(stateUpdate)
						}
					} catch (e) {
						// NB: Don't handleError here - because we optimistically update the
						// status, some of the updates from the event source will throw for
						// being an invalid status transition, but we can just ignore those
						// errors.
						// TODO: Custom errors for status transitions, and only ignore those
						es.close()
						reject(e)
					}
				},
			})
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
		update,
		add,
		get,
		handleError,
		monitor,
	}
}

/**
 * Store and actions for received map shares.
 */
export function createReceivedMapSharesStore({
	clientApi,
	mapServerApi,
	queryClient,
}: {
	clientApi: MapeoClientApi
	mapServerApi: MapServerApi
	queryClient: QueryClient
}) {
	const { subscribe, getSnapshot, update, add, get, handleError, monitor } =
		createMapSharesStore<ReceivedMapShareState>({ mapServerApi })
	// Tracks downloads in progress so they can be aborted. Currently there is no
	// cleanup, but this is unlikely to be an issue in practice.
	const downloads = new Map<string, Promise<string | void>>()

	clientApi.on('map-share', (mapShare: MapShare) => {
		add({ ...mapShare, status: 'pending' })
	})

	const actions = {
		async download({ shareId }: DownloadMapShareOptions) {
			const mapShare = get(shareId)
			update(shareId, { status: 'downloading', bytesDownloaded: 0 })
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
				downloads.set(shareId, downloadIdPromise)
				const downloadId = await downloadIdPromise
				monitor(shareId, `downloads/${downloadId}/events`)
					.then((stateUpdate) => {
						downloads.delete(shareId)
						// Invalidate map queries when download completes to trigger reload of map
						if (stateUpdate.status === 'completed') {
							return invalidateMapQueries(queryClient, {
								mapId: mapShare.mapId,
							})
						}
					})
					.catch(noop)
			} catch (e) {
				downloads.delete(shareId)
				e = await readHttpError(e)
				handleError(shareId, e)
				throw e
			}
		},
		async decline({ shareId, reason }: DeclineMapShareOptions) {
			const mapShare = get(shareId)
			update(shareId, { status: 'declined', reason })
			try {
				await mapServerApi.post(`mapShares/${shareId}/decline`, {
					json: {
						senderDeviceId: mapShare.senderDeviceId,
						mapShareUrls: mapShare.mapShareUrls,
						reason,
					},
				})
			} catch (e) {
				e = await readHttpError(e)
				handleError(shareId, e)
				throw e
			}
		},
		async abort({ shareId }: AbortMapShareOptions) {
			update(shareId, { status: 'aborted' })
			try {
				const downloadId = await downloads.get(shareId)
				if (!downloadId) {
					throw new errors.DOWNLOAD_NOT_FOUND(
						`No download in progress for map share with id ${shareId}`,
					)
				}
				await mapServerApi.post(`downloads/${downloadId}/abort`)
			} catch (e) {
				e = await readHttpError(e)
				handleError(shareId, e)
				throw e
			} finally {
				downloads.delete(shareId)
			}
		},
	}

	return {
		subscribe,
		getSnapshot,
		actions,
	}
}

/**
 * Store and actions for sent map share.
 */
export function createSentMapSharesStore({
	clientApi,
	mapServerApi,
}: {
	clientApi: MapeoClientApi
	mapServerApi: MapServerApi
}) {
	const { subscribe, getSnapshot, update, add, handleError, monitor } =
		createMapSharesStore<SentMapShareState>({ mapServerApi })

	const actions = {
		async createAndSend({
			projectId,
			receiverDeviceId,
			mapId = CUSTOM_MAP_ID,
		}: CreateAndSendMapShareOptions) {
			const mapShare = await mapServerApi
				.post('mapShares', {
					json: { receiverDeviceId, mapId },
				})
				.json<ServerMapShareState>()
			try {
				const project = await clientApi.getProject(projectId)
				await project.$sendMapShare(
					// TODO fix up types on this in @comapeo/core so we don't have to cast
					mapShare as unknown as Omit<
						SentMapShareState,
						'mapShareUrls' | 'bounds'
					> & { mapShareUrls: Array<string>; bounds: Array<number> },
				)
			} catch (e) {
				await mapServerApi.post(`mapShares/${mapShare.shareId}/cancel`)
				throw e
			}
			add(mapShare)
			monitor(mapShare.shareId, `mapShares/${mapShare.shareId}/events`).catch(
				noop,
			)
			return mapShare
		},

		async cancel({ shareId }: CancelMapShareOptions) {
			update(shareId, { status: 'canceled' })
			try {
				await mapServerApi.post(`mapShares/${shareId}/cancel`)
			} catch (e) {
				e = await readHttpError(e)
				handleError(shareId, e)
				throw e
			}
		},
	}

	return {
		subscribe,
		getSnapshot,
		actions,
	}
}

async function readHttpError(e: unknown) {
	if (!isHTTPError(e)) return e
	return e.response.json().catch((e) => e)
}

const allowedStatusTransitions: Record<
	MapShareStatus,
	Array<MapShareStatus>
> = {
	pending: ['pending', 'downloading', 'declined', 'canceled', 'error'],
	downloading: ['downloading', 'aborted', 'completed', 'canceled', 'error'],
	completed: ['error'],
	canceled: ['error'],
	aborted: ['error'],
	declined: ['error'],
	error: ['error'],
}

/**
 * Asserts that the transition from current to next status is valid. Throws if
 * the transition is invalid.
 */
function assertValidStatusTransition(
	current: MapShareStatus,
	next: MapShareStatus,
) {
	if (!allowedStatusTransitions[current].includes(next)) {
		throw new Error(`Invalid status transition from ${current} to ${next}`)
	}
}

const finalStatuses = [
	'declined',
	'canceled',
	'aborted',
	'completed',
	'error',
] as const satisfies Array<MapShareStatus>

/**
 * Returns true if the status is a final status, meaning that no further updates
 * should be expected for the map share.
 */
function isFinalStatus(
	status: MapShareStatus,
): status is (typeof finalStatuses)[number] {
	return finalStatuses.includes(status as (typeof finalStatuses)[number])
}

function noop() {}

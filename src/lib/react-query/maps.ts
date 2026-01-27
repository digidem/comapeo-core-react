import type {
	MapeoClientApi,
	MapeoProjectApi,
} from '@comapeo/ipc' with { 'resolution-mode': 'import' }
import {
	queryOptions,
	type QueryClient,
	type UseMutationOptions,
} from '@tanstack/react-query'

import type { ReceivedMapShareStore } from '../map-share-store.js'
import type {
	AcceptMapShareResult,
	ReceivedMapShareState,
	RejectMapShareParams,
	SendMapShareResult,
} from '../map-share-types.js'
import type { MapServerState } from '../MapServerState.js'
import {
	baseMutationOptions,
	baseQueryOptions,
	ROOT_QUERY_KEY,
} from './shared.js'

// ============================================
// QUERY KEYS
// ============================================

export function getMapsQueryKey() {
	return [ROOT_QUERY_KEY, 'maps'] as const
}

export function getMapSharesQueryKey() {
	return [ROOT_QUERY_KEY, 'maps', 'shares'] as const
}

export function getMapSharesByIdQueryKey({ shareId }: { shareId: string }) {
	return [ROOT_QUERY_KEY, 'maps', 'shares', shareId] as const
}

export function getStyleJsonUrlQueryKey({
	refreshToken,
}: {
	refreshToken?: string
}) {
	return [ROOT_QUERY_KEY, 'maps', 'stylejson_url', { refreshToken }] as const
}

// ============================================
// QUERY OPTIONS
// ============================================

export function mapStyleJsonUrlQueryOptions({
	clientApi,
	refreshToken,
}: {
	clientApi: MapeoClientApi
	refreshToken?: string
}) {
	return queryOptions({
		...baseQueryOptions(),
		queryKey: getStyleJsonUrlQueryKey({ refreshToken }),
		queryFn: async () => {
			const result = await clientApi.getMapStyleJsonUrl()

			if (!refreshToken) return result

			const u = new URL(result)
			u.searchParams.set('refresh_token', refreshToken)
			return u.href
		},
	})
}

/**
 * Query options for getting all received map shares.
 * Uses the ReceivedMapShareStore as the source of truth.
 */
export function getMapSharesQueryOptions({
	store,
}: {
	store: ReceivedMapShareStore
}) {
	return queryOptions({
		...baseQueryOptions(),
		queryKey: getMapSharesQueryKey(),
		queryFn: async (): Promise<Array<ReceivedMapShareState>> => {
			return store.getSnapshot()
		},
		// Stale time is minimal since store updates trigger refetches
		staleTime: 0,
	})
}

/**
 * Query options for getting a specific map share by ID.
 */
export function getMapShareByIdQueryOptions({
	store,
	shareId,
}: {
	store: ReceivedMapShareStore
	shareId: string
}) {
	return queryOptions({
		...baseQueryOptions(),
		queryKey: getMapSharesByIdQueryKey({ shareId }),
		queryFn: async (): Promise<ReceivedMapShareState> => {
			const share = store.getShareById(shareId)
			if (!share) {
				throw new Error(`Map share ${shareId} not found`)
			}
			return share
		},
		staleTime: 0,
	})
}

// ============================================
// MUTATION OPTIONS (Receiver side)
// ============================================

/**
 * Mutation options for accepting a map share.
 * POSTs to /downloads to start the download, then starts SSE tracking.
 */
export function acceptMapShareMutationOptions({
	mapServerState,
	store,
	queryClient,
}: {
	mapServerState: MapServerState
	store: ReceivedMapShareStore
	queryClient: QueryClient
}) {
	return {
		...baseMutationOptions(),
		mutationFn: async ({
			shareId,
		}: {
			shareId: string
		}): Promise<AcceptMapShareResult> => {
			const share = store.getShareById(shareId)
			if (!share) {
				throw new Error(`Share ${shareId} not found`)
			}
			if (share.state !== 'pending') {
				throw new Error(`Cannot accept share in state: ${share.state}`)
			}

			// POST to /downloads to start download
			const response = await mapServerState.fetch('/downloads', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					senderDeviceId: share.senderDeviceId,
					shareId: share.shareId,
					mapShareUrls: share.mapShareUrls,
					estimatedSizeBytes: share.estimatedSizeBytes,
				}),
			})

			if (!response.ok) {
				const error = (await response.json()) as { message?: string }
				throw new Error(error.message || 'Failed to start download')
			}

			const result = (await response.json()) as { downloadId: string }

			// Start tracking download progress via SSE
			store.startDownloadTracking(shareId, result.downloadId)

			return { shareId, downloadId: result.downloadId }
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: getMapSharesQueryKey() })
		},
	} satisfies UseMutationOptions<
		AcceptMapShareResult,
		Error,
		{ shareId: string }
	>
}

/**
 * Mutation options for rejecting a map share.
 * POSTs to /mapShares/{id}/decline to notify the sender.
 */
export function rejectMapShareMutationOptions({
	mapServerState,
	store,
	queryClient,
}: {
	mapServerState: MapServerState
	store: ReceivedMapShareStore
	queryClient: QueryClient
}) {
	return {
		...baseMutationOptions(),
		mutationFn: async ({
			shareId,
			reason = 'user_rejected',
		}: RejectMapShareParams): Promise<void> => {
			const share = store.getShareById(shareId)
			if (!share) {
				throw new Error(`Share ${shareId} not found`)
			}

			// POST to /mapShares/{shareId}/decline
			const response = await mapServerState.fetch(
				`/mapShares/${shareId}/decline`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						senderDeviceId: share.senderDeviceId,
						mapShareUrls: share.mapShareUrls,
						reason,
					}),
				},
			)

			if (!response.ok) {
				const error = (await response.json()) as { message?: string }
				throw new Error(error.message || 'Failed to decline share')
			}

			// Update store state
			store.markRejected(shareId, reason)
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: getMapSharesQueryKey() })
		},
	} satisfies UseMutationOptions<void, Error, RejectMapShareParams>
}

/**
 * Mutation options for aborting an in-progress download.
 */
export function abortMapShareDownloadMutationOptions({
	mapServerState,
	store,
	queryClient,
}: {
	mapServerState: MapServerState
	store: ReceivedMapShareStore
	queryClient: QueryClient
}) {
	return {
		...baseMutationOptions(),
		mutationFn: async ({ shareId }: { shareId: string }): Promise<void> => {
			const share = store.getShareById(shareId)
			if (!share || share.state !== 'downloading') {
				throw new Error('Cannot abort: not downloading')
			}

			const response = await mapServerState.fetch(
				`/downloads/${share.downloadId}/abort`,
				{ method: 'POST' },
			)

			if (!response.ok) {
				const error = (await response.json()) as { message?: string }
				throw new Error(error.message || 'Failed to abort download')
			}

			// Update store state
			store.markAborted(shareId)
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: getMapSharesQueryKey() })
		},
	} satisfies UseMutationOptions<void, Error, { shareId: string }>
}

// ============================================
// MUTATION OPTIONS (Sender side)
// ============================================

/**
 * Mutation options for sending a map share.
 * Creates the share on the map server, then sends via projectApi RPC.
 */
export function sendMapShareMutationOptions({
	mapServerState,
	projectApi,
}: {
	mapServerState: MapServerState
	projectApi: MapeoProjectApi
}) {
	return {
		...baseMutationOptions(),
		mutationFn: async ({
			deviceId,
			mapId,
		}: {
			deviceId: string
			mapId: string
		}): Promise<SendMapShareResult> => {
			// Step 1: Create share on map server
			const response = await mapServerState.fetch('/mapShares', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					mapId,
					receiverDeviceId: deviceId,
				}),
			})

			if (!response.ok) {
				const error = (await response.json()) as { message?: string }
				throw new Error(error.message || 'Failed to create map share')
			}

			const share = (await response.json()) as {
				shareId: string
				mapShareUrls: Array<string>
				mapId: string
				mapName: string
				estimatedSizeBytes: number
				bounds: readonly [number, number, number, number]
				minzoom: number
				maxzoom: number
				mapCreated: number
			}

			// Step 2: Send share offer to recipient via projectApi RPC
			// Note: This method needs to be implemented in @comapeo/core
			await (
				projectApi as MapeoProjectApi & {
					$mapShare: {
						send: (params: {
							deviceId: string
							shareId: string
							mapShareUrls: Array<string>
							mapId: string
							mapName: string
							estimatedSizeBytes: number
							bounds: readonly [number, number, number, number]
							minzoom: number
							maxzoom: number
							mapCreated: number
						}) => Promise<void>
					}
				}
			).$mapShare.send({
				deviceId,
				shareId: share.shareId,
				mapShareUrls: share.mapShareUrls,
				mapId: share.mapId,
				mapName: share.mapName,
				estimatedSizeBytes: share.estimatedSizeBytes,
				bounds: share.bounds,
				minzoom: share.minzoom,
				maxzoom: share.maxzoom,
				mapCreated: share.mapCreated,
			})

			// Resolve immediately after sending - don't wait for response
			return { shareId: share.shareId }
		},
	} satisfies UseMutationOptions<
		SendMapShareResult,
		Error,
		{ deviceId: string; mapId: string }
	>
}

/**
 * Mutation options for canceling a sent map share.
 */
export function requestCancelMapShareMutationOptions({
	mapServerState,
	queryClient,
}: {
	mapServerState: MapServerState
	queryClient: QueryClient
}) {
	return {
		...baseMutationOptions(),
		mutationFn: async ({ shareId }: { shareId: string }): Promise<void> => {
			const response = await mapServerState.fetch(
				`/mapShares/${shareId}/cancel`,
				{ method: 'POST' },
			)

			if (!response.ok) {
				const error = (await response.json()) as { message?: string }
				throw new Error(error.message || 'Failed to cancel share')
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: getMapSharesQueryKey() })
		},
	} satisfies UseMutationOptions<void, Error, { shareId: string }>
}

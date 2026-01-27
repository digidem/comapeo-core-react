import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react'

import { useMapServerState } from '../contexts/MapServer.js'
import {
	ReceivedMapShareStore,
	SentMapShareStore,
} from '../lib/map-share-store.js'
import type {
	MapShareState,
	ReceivedMapShareState,
} from '../lib/map-share-types.js'
import {
	abortMapShareDownloadMutationOptions,
	acceptMapShareMutationOptions,
	getMapShareByIdQueryOptions,
	getMapSharesQueryKey,
	getMapSharesQueryOptions,
	mapStyleJsonUrlQueryOptions,
	rejectMapShareMutationOptions,
	requestCancelMapShareMutationOptions,
	sendMapShareMutationOptions,
} from '../lib/react-query/maps.js'
import { useClientApi } from './client.js'
import { useSingleProject } from './projects.js'

// WeakMap to cache ReceivedMapShareStore per clientApi instance
const RECEIVED_SHARE_STORES = new WeakMap<object, ReceivedMapShareStore>()

// Map to cache SentMapShareStore per shareId
const SENT_SHARE_STORES = new Map<string, SentMapShareStore>()

/**
 * Internal hook to get or create the ReceivedMapShareStore.
 */
function useReceivedMapShareStore(): ReceivedMapShareStore {
	const clientApi = useClientApi()
	const mapServerState = useMapServerState()

	return useMemo(() => {
		let store = RECEIVED_SHARE_STORES.get(clientApi)
		if (!store) {
			store = new ReceivedMapShareStore(clientApi, mapServerState)
			RECEIVED_SHARE_STORES.set(clientApi, store)
		}
		return store
	}, [clientApi, mapServerState])
}

/**
 * Get a URL that points to a StyleJSON resource served by the embedded HTTP server.
 *
 * If `opts.refreshToken` is specified, it will be appended to the returned URL as a search param. This is useful for forcing cache busting
 * due to hidden internal details by consuming components (e.g. map component from MapLibre).
 *
 * @param opts.refreshToken String to append to the returned value as a search param
 *
 * @example
 * ```tsx
 * function ExampleWithoutRefreshToken() {
 *   const { data, isRefetching } = useMapStyleUrl()
 *
 *   console.log(data) // logs something like 'http://localhost:...'
 * }
 * ```
 *
 * ```tsx
 * function ExampleWithRefreshToken() {
 *   const [refreshToken] = useState('foo')
 *   const { data } = useMapStyleUrl({ refreshToken })
 *
 *   console.log(data) // logs something like 'http://localhost:...?refresh_token=foo'
 * }
 * ```
 */
export function useMapStyleUrl({
	refreshToken,
}: {
	refreshToken?: string
} = {}) {
	const clientApi = useClientApi()

	const { data, error, isRefetching } = useSuspenseQuery(
		mapStyleJsonUrlQueryOptions({ clientApi, refreshToken }),
	)

	return { data, error, isRefetching }
}

// ============================================
// RECEIVER HOOKS
// ============================================

/**
 * Get all map shares that the device has received. Automatically updates when new shares arrive or share states change.
 *
 * Requires `MapServerProvider` to be set up.
 *
 * @example
 * ```tsx
 * function MapSharesList() {
 *   const { data: shares } = useManyMapShares()
 *
 *   return shares.map(share => (
 *     <div key={share.shareId}>
 *       {share.mapName} from {share.senderDeviceName} - {share.state}
 *     </div>
 *   ))
 * }
 * ```
 */
export function useManyMapShares() {
	const store = useReceivedMapShareStore()
	const queryClient = useQueryClient()

	// Subscribe to store changes to trigger query refetch
	useEffect(() => {
		return store.subscribe(() => {
			queryClient.invalidateQueries({ queryKey: getMapSharesQueryKey() })
		})
	}, [store, queryClient])

	const { data, error, isRefetching } = useSuspenseQuery(
		getMapSharesQueryOptions({ store }),
	)

	return { data, error, isRefetching }
}

/**
 * Get a single map share based on its ID.
 *
 * Requires `MapServerProvider` to be set up.
 *
 * @param opts.shareId ID of the map share
 *
 * @example
 * ```tsx
 * function MapShareDetail({ shareId }: { shareId: string }) {
 *   const { data: share } = useSingleMapShare({ shareId })
 *
 *   return <div>{share.mapName} - {share.state}</div>
 * }
 * ```
 */
export function useSingleMapShare({ shareId }: { shareId: string }) {
	const store = useReceivedMapShareStore()

	const { data, error, isRefetching } = useSuspenseQuery(
		getMapShareByIdQueryOptions({ store, shareId }),
	)

	return { data, error, isRefetching }
}

/**
 * Accept and download a map share that has been received. The mutate promise resolves once the map _starts_ downloading, before it finishes downloading. Use `useManyMapShares` or `useSingleMapShare` to track download progress.
 *
 * Requires `MapServerProvider` to be set up.
 *
 * @example
 * ```tsx
 * function AcceptButton({ shareId }: { shareId: string }) {
 *   const { mutate: accept } = useAcceptMapShare()
 *
 *   return <button onClick={() => accept({ shareId })}>Accept</button>
 * }
 * ```
 */
export function useAcceptMapShare() {
	const queryClient = useQueryClient()
	const mapServerState = useMapServerState()
	const store = useReceivedMapShareStore()

	const { error, mutate, mutateAsync, reset, status } = useMutation(
		acceptMapShareMutationOptions({ mapServerState, store, queryClient }),
	)

	return status === 'error'
		? { error, mutate, mutateAsync, reset, status }
		: { error: null, mutate, mutateAsync, reset, status }
}

/**
 * Reject a map share that has been received. Notifies the sender that the share was declined.
 *
 * Requires `MapServerProvider` to be set up.
 *
 * @example
 * ```tsx
 * function RejectButton({ shareId }: { shareId: string }) {
 *   const { mutate: reject } = useRejectMapShare()
 *
 *   return (
 *     <button onClick={() => reject({ shareId, reason: 'user_rejected' })}>
 *       Reject
 *     </button>
 *   )
 * }
 * ```
 */
export function useRejectMapShare() {
	const queryClient = useQueryClient()
	const mapServerState = useMapServerState()
	const store = useReceivedMapShareStore()

	const { error, mutate, mutateAsync, reset, status } = useMutation(
		rejectMapShareMutationOptions({ mapServerState, store, queryClient }),
	)

	return status === 'error'
		? { error, mutate, mutateAsync, reset, status }
		: { error: null, mutate, mutateAsync, reset, status }
}

/**
 * Abort an in-progress map share download.
 *
 * Requires `MapServerProvider` to be set up.
 *
 * @example
 * ```tsx
 * function AbortButton({ shareId }: { shareId: string }) {
 *   const { mutate: abort } = useAbortMapShareDownload()
 *
 *   return <button onClick={() => abort({ shareId })}>Cancel Download</button>
 * }
 * ```
 */
export function useAbortMapShareDownload() {
	const queryClient = useQueryClient()
	const mapServerState = useMapServerState()
	const store = useReceivedMapShareStore()

	const { error, mutate, mutateAsync, reset, status } = useMutation(
		abortMapShareDownloadMutationOptions({
			mapServerState,
			store,
			queryClient,
		}),
	)

	return status === 'error'
		? { error, mutate, mutateAsync, reset, status }
		: { error: null, mutate, mutateAsync, reset, status }
}

/**
 * Get download progress for a received map share. Returns `null` if the share is not currently downloading.
 *
 * Requires `MapServerProvider` to be set up.
 *
 * @param opts.shareId ID of the map share
 *
 * @example
 * ```tsx
 * function DownloadProgress({ shareId }: { shareId: string }) {
 *   const progress = useMapShareDownloadProgress({ shareId })
 *
 *   if (!progress) return <div>Not downloading</div>
 *
 *   return <div>{Math.round(progress.progress * 100)}% downloaded</div>
 * }
 * ```
 */
export function useMapShareDownloadProgress({
	shareId,
}: {
	shareId: string
}): { progress: number; bytesDownloaded: number; totalBytes: number } | null {
	const { data: share } = useSingleMapShare({ shareId })

	if (share.state !== 'downloading') return null

	const bytesDownloaded = share.bytesDownloaded
	const totalBytes = share.estimatedSizeBytes
	const progress = totalBytes > 0 ? bytesDownloaded / totalBytes : 0

	return { progress, bytesDownloaded, totalBytes }
}

// ============================================
// SENDER HOOKS
// ============================================

/**
 * Share a map with a device. The mutation resolves immediately after sending the share offer, without waiting for the recipient to accept or reject. Use `useSentMapShareProgress` to track the status of the share.
 *
 * Requires `MapServerProvider` to be set up.
 *
 * @param opts.projectId Public ID of project to send the share on behalf of.
 *
 * @example
 * ```tsx
 * function SendMapButton({ projectId, deviceId }: { projectId: string; deviceId: string }) {
 *   const { mutate: send } = useSendMapShare({ projectId })
 *
 *   return (
 *     <button onClick={() => send({ deviceId, mapId: 'custom' })}>
 *       Send Map
 *     </button>
 *   )
 * }
 * ```
 */
export function useSendMapShare({ projectId }: { projectId: string }) {
	const mapServerState = useMapServerState()
	const { data: projectApi } = useSingleProject({ projectId })

	const { error, mutate, mutateAsync, reset, status } = useMutation(
		sendMapShareMutationOptions({ mapServerState, projectApi }),
	)

	return status === 'error'
		? { error, mutate, mutateAsync, reset, status }
		: { error: null, mutate, mutateAsync, reset, status }
}

/**
 * Request a cancellation of a map share that was previously sent.
 *
 * Requires `MapServerProvider` to be set up.
 *
 * @param opts.projectId Public ID of project to request the map share cancellation for.
 *
 * @example
 * ```tsx
 * function CancelShareButton({ projectId, shareId }: { projectId: string; shareId: string }) {
 *   const { mutate: cancel } = useRequestCancelMapShare({ projectId })
 *
 *   return <button onClick={() => cancel({ shareId })}>Cancel Share</button>
 * }
 * ```
 */
export function useRequestCancelMapShare({
	projectId: _projectId,
}: {
	projectId: string
}) {
	const queryClient = useQueryClient()
	const mapServerState = useMapServerState()

	const { error, mutate, mutateAsync, reset, status } = useMutation(
		requestCancelMapShareMutationOptions({ mapServerState, queryClient }),
	)

	return status === 'error'
		? { error, mutate, mutateAsync, reset, status }
		: { error: null, mutate, mutateAsync, reset, status }
}

/**
 * Track the progress of a sent map share via SSE. Returns the current state of the share, updated in real-time.
 *
 * Requires `MapServerProvider` to be set up.
 *
 * @param opts.shareId ID of the sent map share
 * @param opts.initialState Initial state of the share (from `useSendMapShare` result or server response)
 *
 * @example
 * ```tsx
 * function SentShareStatus({ shareId, initialState }: { shareId: string; initialState: MapShareState }) {
 *   const state = useSentMapShareProgress({ shareId, initialState })
 *
 *   return <div>Share status: {state.status}</div>
 * }
 * ```
 */
export function useSentMapShareProgress({
	shareId,
	initialState,
}: {
	shareId: string
	initialState: MapShareState
}): MapShareState {
	const mapServerState = useMapServerState()

	// Create or retrieve store for this share
	const storeRef = useRef<SentMapShareStore | null>(null)

	if (!storeRef.current) {
		let existingStore = SENT_SHARE_STORES.get(shareId)
		if (!existingStore) {
			existingStore = new SentMapShareStore(
				shareId,
				mapServerState,
				initialState,
			)
			SENT_SHARE_STORES.set(shareId, existingStore)
		}
		storeRef.current = existingStore
	}

	const store = storeRef.current

	// Cleanup store from cache when share is in terminal state
	useEffect(() => {
		return () => {
			const currentState = store.getSnapshot()
			if (
				currentState.status === 'completed' ||
				currentState.status === 'canceled' ||
				currentState.status === 'declined' ||
				currentState.status === 'error'
			) {
				SENT_SHARE_STORES.delete(shareId)
			}
		}
	}, [shareId, store])

	return useSyncExternalStore(store.subscribe, store.getSnapshot)
}

// ============================================
// TYPE EXPORTS
// ============================================

export type { ReceivedMapShareState, MapShareState }

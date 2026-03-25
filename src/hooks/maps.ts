import type { MapInfoResponse } from '@comapeo/map-server'
import { CUSTOM_MAP_ID, DEFAULT_MAP_ID } from '@comapeo/map-server/constants.js'
import { errors } from '@comapeo/map-server/errors.js'
import {
	useMutation,
	useQuery,
	useQueryClient,
	useSuspenseQuery,
} from '@tanstack/react-query'
import { useCallback } from 'react'

import { useMapServerApi } from '../contexts/MapServer.js'
import {
	useReceivedMapSharesActions,
	useReceivedMapSharesState,
	useSentMapSharesActions,
	useSentMapSharesState,
} from '../contexts/MapShares.js'
import type {
	AbortMapShareOptions,
	CancelMapShareOptions,
	CreateAndSendMapShareOptions,
	DeclineMapShareOptions,
	DownloadMapShareOptions,
	ReceivedMapShareState,
	SentMapShareState,
} from '../lib/map-shares-stores.js'
import {
	baseMutationOptions,
	baseQueryOptions,
	filterMutationResult,
	getMapInfoQueryKey,
	getStyleJsonUrlQueryKey,
	invalidateMapQueries,
} from '../lib/react-query.js'

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
export function useMapStyleUrl() {
	const mapServerApi = useMapServerApi()

	// TODO: Support custom maps
	const mapId = DEFAULT_MAP_ID

	const { data, error, isRefetching } = useSuspenseQuery({
		...baseQueryOptions(),
		queryKey: getStyleJsonUrlQueryKey({ mapId }),
		queryFn: async () => {
			const result = await mapServerApi.getMapStyleJsonUrl(mapId)
			const u = new URL(result)
			// This ensures that every time this query is refetched, it will have a different search param, forcing the map to reload.
			u.searchParams.set('refresh_token', Date.now().toString())
			return u.href
		},
		// Keep this cached until the cache is manually invalidated by a map upload
		staleTime: Infinity,
		gcTime: Infinity,
	})

	return { data, error, isRefetching }
}

// Expo's file-system File type is close to the standard File type, so for our
// import function we accept an object with the compatible properties and
// methods, and for the expo File, which can represent a file that does not yet
// exists, we type the `exists` property so that we can check that.
type CompatFile = Omit<File, 'lastModified' | 'webkitRelativePath'>
type ExpoFileDuckType = CompatFile & {
	exists: boolean
}

/**
 * Import a custom SMP map file, replacing any existing custom map. The mutation
 * resolves once the file is successfully uploaded and processed by the server.
 *
 * @example
 * ```tsx
 * function MapImportExample() {
 *   const { mutate: importMap } = useImportCustomMapFile()
 *
 * }
 * ```
 */
export function useImportCustomMapFile() {
	const mapServerApi = useMapServerApi()
	const queryClient = useQueryClient()

	// TODO: Support importing to other custom map IDs, to support multiple maps.
	const mapId = CUSTOM_MAP_ID

	return filterMutationResult(
		useMutation({
			...baseMutationOptions(),
			mutationFn: async ({ file }: { file: File | ExpoFileDuckType }) => {
				if ('exists' in file && !file.exists) {
					throw new Error('File does not exist or is not accessible')
				}
				return mapServerApi.put(`maps/${mapId}`, {
					body: file,
					headers: {
						'Content-Type': 'application/octet-stream',
					},
				})
			},
			onSuccess: async () => {
				await invalidateMapQueries(queryClient, { mapId })
			},
		}),
	)
}

export function useRemoveCustomMapFile() {
	const mapServerApi = useMapServerApi()
	const queryClient = useQueryClient()

	const mapId = CUSTOM_MAP_ID

	return filterMutationResult(
		useMutation({
			...baseMutationOptions(),
			mutationFn: async () => {
				return mapServerApi.delete(`maps/${mapId}`)
			},
			onSuccess: async () => {
				await invalidateMapQueries(queryClient, { mapId })
			},
		}),
	)
}

export function useGetCustomMapInfo() {
	const mapServerApi = useMapServerApi()

	// TODO: Support custom maps
	const mapId = CUSTOM_MAP_ID

	const { data, error, isRefetching } = useQuery({
		...baseQueryOptions(),
		queryKey: getMapInfoQueryKey({ mapId }),
		queryFn: async () => {
			return mapServerApi.get(`maps/${mapId}/info`).json<MapInfoResponse>()
		},
		// Keep this cached until the cache is manually invalidated by a map upload
		staleTime: Infinity,
		gcTime: Infinity,
	})

	return { data, error, isRefetching }
}

// ============================================
// RECEIVER HOOKS
// ============================================

/**
 * Get all map shares that the device has received. Automatically updates when
 * new shares arrive or share states change.
 *
 * IMPORTANT: This hook will not trigger a re-render when download progress
 * updates, only when the status changes. This is to avoid excessive re-renders
 * during downloads. Use `useSingleReceivedMapShare` to get real-time updates on
 * a specific share, including download progress.
 *
 * @example
 * ```tsx
 * function MapSharesList() {
 *   const shares = useManyReceivedMapShares()
 *
 *   return shares.map(share => (
 *     <div key={share.shareId}>
 *       {share.mapName} from {share.senderDeviceName} - {share.state}
 *     </div>
 *   ))
 * }
 * ```
 */
export function useManyReceivedMapShares() {
	return useReceivedMapSharesState()
}

/**
 * Get a single received map share based on its shareId.
 *
 * @param opts.shareId ID of the map share
 *
 * @example
 * ```tsx
 * function MapShareDetail({ shareId }: { shareId: string }) {
 *   const share = useSingleReceivedMapShare({ shareId })
 *
 *   return <div>{share.mapName} - {share.state}</div>
 * }
 * ```
 */
export function useSingleReceivedMapShare({ shareId }: { shareId: string }) {
	const mapShare = useReceivedMapSharesState(
		useCallback(
			(shares: Array<ReceivedMapShareState>) =>
				shares.find((s) => s.shareId === shareId),
			[shareId],
		),
	)
	if (!mapShare) {
		throw new Error(`Map share with id ${shareId} not found`)
	}
	return mapShare
}

/**
 * Accept and download a map share that has been received. The mutate promise
 * resolves once the map _starts_ downloading, before it finishes downloading.
 * Use `useManyReceivedMapShares` or `useSingleReceivedMapShare` to track
 * download progress and final status.
 *
 * If the sender canceled the share before the receiver calls this, the
 * mutation will still resolve (the download starts), but the share status will
 * end up as `'canceled'` rather than `'completed'`. This is the only way the
 * receiver discovers that a share has been canceled — check `share.status`
 * after the download settles.
 *
 * @throws {MapShareCanceledError} If the share is already known to be canceled
 *   (i.e. `status` is `'canceled'` in the store, e.g. after a previous
 *   download attempt discovered the cancellation).
 * @throws {InvalidStatusTransitionError} If the share is not in a valid state
 *   to start downloading (e.g. already downloading, completed, or declined).
 *
 * @example
 * ```tsx
 * function AcceptButton({ shareId }: { shareId: string }) {
 *   const { mutate: accept } = useDownloadReceivedMapShare()
 *
 *   return <button onClick={() => accept({ shareId })}>Accept</button>
 * }
 * ```
 */
export function useDownloadReceivedMapShare() {
	const { download } = useReceivedMapSharesActions()

	return filterMutationResult(
		useMutation({
			...baseMutationOptions(),
			mutationFn: async (options: DownloadMapShareOptions) => {
				return download(options)
			},
		}),
	)
}

/**
 * Decline a map share that has been received. Notifies the sender that the
 * share was declined. The share status is only updated to `'declined'` after
 * the server confirms the decline — there is no optimistic update.
 *
 * If the sender canceled the share before the decline reaches the server, the
 * share status will transition to `'canceled'` (not `'error'`) and the
 * mutation will throw a `MapShareCanceledError`.
 *
 * @throws {MapShareCanceledError} If the share is already known to be
 *   canceled, or if the server reports that the sender canceled the share
 *   while the decline was in flight. In both cases `share.status` will be
 *   `'canceled'`.
 * @throws {InvalidStatusTransitionError} If the share is not in
 *   `status='pending'` (e.g. already downloading, completed, or declined).
 *
 * @example
 * ```tsx
 * import { DeclineReason } from '@comapeo/core-react'
 * function DeclineButton({ shareId }: { shareId: string }) {
 *   const { mutate: decline } = useDeclineReceivedMapShare()
 *
 *   return (
 *     <button onClick={() => decline({ shareId, reason: DeclineReason.user_rejected })}>
 *       Decline
 *     </button>
 *   )
 * }
 * ```
 */
export function useDeclineReceivedMapShare() {
	const { decline } = useReceivedMapSharesActions()

	return filterMutationResult(
		useMutation({
			...baseMutationOptions(),
			mutationFn: async (options: DeclineMapShareOptions) => {
				return decline(options)
			},
		}),
	)
}

/**
 * Abort an in-progress map share download.
 *
 * @throws {MapShareCanceledError} If the share is already known to be canceled.
 * @throws {InvalidStatusTransitionError} If the share is not in
 *   `status='downloading'` (e.g. still pending, already completed, or
 *   declined).
 *
 * @example
 * ```tsx
 * function AbortButton({ shareId }: { shareId: string }) {
 *   const { mutate: abort } = useAbortReceivedMapShareDownload()
 *
 *   return <button onClick={() => abort({ shareId })}>Cancel Download</button>
 * }
 * ```
 */
export function useAbortReceivedMapShareDownload() {
	const { abort } = useReceivedMapSharesActions()

	return filterMutationResult(
		useMutation({
			...baseMutationOptions(),
			mutationFn: async (options: AbortMapShareOptions) => {
				return abort(options)
			},
		}),
	)
}

// ============================================
// SENDER HOOKS
// ============================================

/**
 * Share a map with a device. The mutation resolves immediately after sending
 * the share offer, without waiting for the recipient to accept or reject. The
 * mutation resolves with the created map share object, including its ID, which
 * can be used to track the share status with `useSingleSentMapShare`.
 *
 * @param opts.projectId Public ID of project for sending the map share: you can only send map shares to users on the same project
 *
 * @example
 * ```tsx
 * function SendMapButton({ projectId, deviceId }: { projectId: string; deviceId: string }) {
 *	const { mutate: send } = useSendMapShare()
 *
 *	return (
 *		<button
 *			onClick={() =>
 *				send({ projectId, receiverDeviceId: deviceId, mapId: 'custom' }, {
 *                    onSuccess: (mapShare) => {
 *                        console.log('Share sent with id', mapShare.shareId)
 *                    }
 *              )
 *			}
 *		>
 *			Send Map
 *		</button>
 *	)
 * }
 * ```
 */
export function useSendMapShare() {
	const { createAndSend } = useSentMapSharesActions()

	return filterMutationResult(
		useMutation({
			...baseMutationOptions(),
			mutationFn: async (options: CreateAndSendMapShareOptions) => {
				return createAndSend(options)
			},
		}),
	)
}

/**
 * Cancel a map share that was previously sent. If the recipient has not yet
 * started downloading the share, they will not be notified until they attempt
 * to accept the share and begin downloading it. If they are already downloading
 * the share, the download will be canceled before completion. If the download
 * is already complete, this action will throw an error.
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
export function useCancelSentMapShare() {
	const { cancel } = useSentMapSharesActions()

	return filterMutationResult(
		useMutation({
			...baseMutationOptions(),
			mutationFn: async (options: CancelMapShareOptions) => {
				return cancel(options)
			},
		}),
	)
}

/**
 * Track the status and progress of a sent map share. Returns the current state
 * of the share, updated in real-time. When the recipient starts downloading, or
 * if they decline the share, then the returned share will update.
 *
 * Throws if no share with the specified ID is found.
 *
 * @param opts.shareId ID of the sent map share
 *
 * @example
 * ```tsx
 * function SentShareStatus({ shareId }: { shareId: string }) {
 *   const mapShare = useSingleSentMapShare({ shareId })
 *
 *   return (<div>
 * 		<div>Share status: {mapShare.status}</div>
 *    {mapShare.status === 'pending' && <div>Waiting for recipient to accept...</div>}
 *   	{mapShare.status === 'downloading' && (<div>Download in progress: {mapShare.downloadProgress}%</div>)}
 *   	{mapShare.status === 'declined' && <div>Share was declined by recipient</div>}
 * 	  {mapShare.status === 'canceled' && <div>Share was canceled</div>}
 *   </div>)
 * }
 * ```
 */
export function useSingleSentMapShare({
	shareId,
}: {
	shareId: string
}): SentMapShareState {
	const mapShare = useSentMapSharesState(
		useCallback(
			(shares: Array<SentMapShareState>) =>
				shares.find((s) => s.shareId === shareId),
			[shareId],
		),
	)
	if (!mapShare) {
		throw new errors.MAP_SHARE_NOT_FOUND(
			`Sent map share with id ${shareId} not found`,
		)
	}
	return mapShare
}

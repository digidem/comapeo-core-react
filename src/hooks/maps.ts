import { CUSTOM_MAP_ID } from '@comapeo/map-server/constants.js'
import { errors } from '@comapeo/map-server/errors.js'
import {
	useMutation,
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
import {
	type ReceivedMapShareState,
	type SentMapShareState,
} from '../lib/map-shares-stores.js'
import {
	mapImportMutationOptions,
	mapInfoQueryOptions,
	mapRemoveMutationOptions,
	mapSharesMutationOptions,
	mapStyleJsonUrlQueryOptions,
} from '../lib/react-query/maps.js'
import { filterMutationResult } from '../lib/react-query/mutation-result.js'

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

	const { data, error, isRefetching } = useSuspenseQuery(
		mapStyleJsonUrlQueryOptions({ mapServerApi }),
	)

	return { data, error, isRefetching }
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
	const options = mapImportMutationOptions({ mapServerApi, queryClient })
	const result = useMutation(options)
	return filterMutationResult(result)
}

export function useRemoveCustomMapFile() {
	const mapServerApi = useMapServerApi()
	const queryClient = useQueryClient()
	const options = mapRemoveMutationOptions({ mapServerApi, queryClient })
	const result = useMutation(options)
	return filterMutationResult(result)
}

export function useGetCustomMapInfo() {
	const mapServerApi = useMapServerApi()
	const { data, error, isRefetching } = useSuspenseQuery(
		mapInfoQueryOptions({ mapServerApi, mapId: CUSTOM_MAP_ID }),
	)

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
 * Use `useManyMapShares` or `useSingleMapShare` to track download progress.
 *
 * Throws if the share is not in `status="pending"` or if the download fails to
 * start (e.g. if the shareId if invalid).
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
export function useDownloadReceivedMapShare() {
	const { download } = useReceivedMapSharesActions()
	const options = mapSharesMutationOptions({ action: download })
	const result = useMutation(options)
	return filterMutationResult(result)
}

/**
 * Decline a map share that has been received. Notifies the sender that the
 * share was declined.
 *
 * Throws if the share is not with `status="pending"`
 * Throws if shareId is invalid
 * Throws if decline request fails (e.g. network error)
 *
 * @example
 * ```tsx
 * function DeclineButton({ shareId }: { shareId: string }) {
 *   const { mutate: decline } = useDeclineMapShare()
 *
 *   return (
 *     <button onClick={() => decline({ shareId, reason: 'user_rejected' })}>
 *       Decline
 *     </button>
 *   )
 * }
 * ```
 */
export function useDeclineReceivedMapShare() {
	const { decline } = useReceivedMapSharesActions()
	const options = mapSharesMutationOptions({ action: decline })
	const result = useMutation(options)
	return filterMutationResult(result)
}

/**
 * Abort an in-progress map share download.
 *
 * Throws if the share is not in `status="downloading"`
 * Throws if shareId is invalid
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
export function useAbortReceivedMapShareDownload() {
	const { abort } = useReceivedMapSharesActions()
	const options = mapSharesMutationOptions({ action: abort })
	const result = useMutation(options)
	return filterMutationResult(result)
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
 *   const { mutate: send } = useSendMapShare({ projectId }, {
 *     onSuccess: (mapShare) => {
 *  	   console.log('Share sent with id', mapShare.shareId)
 *     }
 *   })
 *
 *   return (
 *     <button onClick={() => send({ receiverDeviceId: deviceId, mapId: 'custom' })}>
 *       Send Map
 *     </button>
 *   )
 * }
 * ```
 */
export function useSendMapShare({ projectId }: { projectId: string }) {
	const { createAndSend } = useSentMapSharesActions()
	const options = mapSharesMutationOptions({ action: createAndSend, projectId })
	const result = useMutation(options)
	return filterMutationResult(result)
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
	const options = mapSharesMutationOptions({ action: cancel })
	const result = useMutation(options)
	return filterMutationResult(result)
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

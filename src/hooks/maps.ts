import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from '@tanstack/react-query'

import {
	acceptMapShareMutationOptions,
	getMapShareByIdQueryOptions,
	getMapSharesQueryOptions,
	mapStyleJsonUrlQueryOptions,
	rejectMapShareMutationOptions,
	requestCancelMapShareMutationOptions,
	sendMapShareMutationOptions,
} from '../lib/react-query/maps.js'
import { useClientApi } from './client.js'
import { useSingleProject } from './projects.js'

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

/**
 * Get all map shares that the device has received.
 *
 * @example
 * ```ts
 * function Example() {
 *   const { data } = useManyMapShares()
 * }
 * ```
 */
export function useManyMapShares() {
	const clientApi = useClientApi()
	const { data, error, isRefetching } = useSuspenseQuery(
		getMapSharesQueryOptions({ clientApi }),
	)

	return { data, error, isRefetching }
}

/**
 * Get a single map share based on its ID.
 *
 * @param opts.shareId ID of map share
 *
 * @example
 * ```ts
 * function Example() {
 *   const { data } = useSingleMapShare({ shareId: '...' })
 * }
 * ```
 */
export function useSingleMapShare({ shareId }: { shareId: string }) {
	const clientApi = useClientApi()

	const { data, error, isRefetching } = useSuspenseQuery(
		getMapShareByIdQueryOptions({ clientApi, shareId }),
	)

	return { data, error, isRefetching }
}

/**
 * Accept and download a map share that has been received. The mutate promise
 * resolves once the map _starts_ downloading, before it finishes downloading.
 * The hooks useManyMapShares and useSingleMapShare can be used to track
 * download progress.
 */
export function useAcceptMapShare() {
	const queryClient = useQueryClient()
	const clientApi = useClientApi()

	const { error, mutate, mutateAsync, reset, status } = useMutation(
		acceptMapShareMutationOptions({ clientApi, queryClient }),
	)

	return status === 'error'
		? { error, mutate, mutateAsync, reset, status }
		: { error: null, mutate, mutateAsync, reset, status }
}

/**
 * Reject a map share that has been received.
 */
export function useRejectMapShare() {
	const queryClient = useQueryClient()
	const clientApi = useClientApi()

	const { error, mutate, mutateAsync, reset, status } = useMutation(
		rejectMapShareMutationOptions({ clientApi, queryClient }),
	)

	return status === 'error'
		? { error, mutate, mutateAsync, reset, status }
		: { error: null, mutate, mutateAsync, reset, status }
}

/**
 * Share a map with a device. The mutation method resolves when the share is
 * accepted (the recipient starts downloading the map), or if they reject the
 * share or they already have that map on their device (this reply is
 * automatic).
 *
 * @param opts.projectId Public ID of project to send the invite on behalf of.
 */
export function useSendMapShare({ projectId }: { projectId: string }) {
	const queryClient = useQueryClient()
	const { data: projectApi } = useSingleProject({ projectId })

	const { error, mutate, mutateAsync, reset, status } = useMutation(
		sendMapShareMutationOptions({ projectApi, projectId, queryClient }),
	)

	return status === 'error'
		? { error, mutate, mutateAsync, reset, status }
		: { error: null, mutate, mutateAsync, reset, status }
}

/**
 * Request a cancellation of an invite sent to another device.
 *
 * @param opts.projectId Public ID of project to request the invite cancellation for.
 */
export function useRequestCancelInvite({ projectId }: { projectId: string }) {
	const queryClient = useQueryClient()
	const { data: projectApi } = useSingleProject({ projectId })

	const { error, mutate, mutateAsync, reset, status } = useMutation(
		requestCancelMapShareMutationOptions({ projectApi, queryClient }),
	)

	return status === 'error'
		? { error, mutate, mutateAsync, reset, status }
		: { error: null, mutate, mutateAsync, reset, status }
}

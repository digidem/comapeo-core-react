import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from '@tanstack/react-query'

import {
	acceptInviteMutationOptions,
	getInviteByIdQueryOptions,
	getInvitesQueryOptions,
	rejectInviteMutationOptions,
	requestCancelInviteMutationOptions,
	sendInviteMutationOptions,
} from '../lib/react-query/invites.js'
import { useClientApi } from './client.js'
import { useSingleProject } from './projects.js'

/**
 * Get all invites that the device has received.
 *
 * @example
 * ```ts
 * function Example() {
 *   const { data } = useManyInvites()
 * }
 * ```
 */
export function useManyInvites() {
	const clientApi = useClientApi()
	const { data, error, isRefetching } = useSuspenseQuery(
		getInvitesQueryOptions({ clientApi }),
	)

	return { data, error, isRefetching }
}

/**
 * Get a single invite based on its ID.
 *
 * @param opts.inviteId ID of invite
 *
 * @example
 * ```ts
 * function Example() {
 *   const { data } = useSingleInvite({ inviteId: '...' })
 * }
 * ```
 */
export function useSingleInvite({ inviteId }: { inviteId: string }) {
	const clientApi = useClientApi()

	const { data, error, isRefetching } = useSuspenseQuery(
		getInviteByIdQueryOptions({ clientApi, inviteId }),
	)

	return { data, error, isRefetching }
}

/**
 * Accept an invite that has been received.
 */
export function useAcceptInvite() {
	const queryClient = useQueryClient()
	const clientApi = useClientApi()

	const { error, mutate, mutateAsync, reset, status } = useMutation(
		acceptInviteMutationOptions({ clientApi, queryClient }),
	)

	return status === 'error'
		? { error, mutate, mutateAsync, reset, status }
		: { error: null, mutate, mutateAsync, reset, status }
}

/**
 * Reject an invite that has been received.
 */
export function useRejectInvite() {
	const queryClient = useQueryClient()
	const clientApi = useClientApi()

	const { error, mutate, mutateAsync, reset, status } = useMutation(
		rejectInviteMutationOptions({ clientApi, queryClient }),
	)

	return status === 'error'
		? { error, mutate, mutateAsync, reset, status }
		: { error: null, mutate, mutateAsync, reset, status }
}

/**
 * Send an invite for a project.
 *
 * @param opts.projectId Public ID of project to send the invite on behalf of.
 */
export function useSendInvite({ projectId }: { projectId: string }) {
	const queryClient = useQueryClient()
	const { data: projectApi } = useSingleProject({ projectId })

	const { error, mutate, mutateAsync, reset, status } = useMutation(
		sendInviteMutationOptions({ projectApi, projectId, queryClient }),
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
		requestCancelInviteMutationOptions({ projectApi, queryClient }),
	)

	return status === 'error'
		? { error, mutate, mutateAsync, reset, status }
		: { error: null, mutate, mutateAsync, reset, status }
}

import { InviteApi, MemberApi } from '@comapeo/core'
import {
	useMutation,
	UseMutationResult,
	useQueryClient,
	useSuspenseQuery,
	UseSuspenseQueryResult,
} from '@tanstack/react-query'

import {
	baseMutationOptions,
	baseQueryOptions,
	getInvitesByIdQueryKey,
	getInvitesQueryKey,
	getMembersQueryKey,
	getProjectsQueryKey,
} from '../lib/react-query.js'
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
export function useManyInvites(): Pick<
	UseSuspenseQueryResult<Array<InviteApi.Invite>>,
	'data' | 'error' | 'isRefetching'
> {
	const clientApi = useClientApi()

	const { data, error, isRefetching } = useSuspenseQuery({
		...baseQueryOptions(),
		queryKey: getInvitesQueryKey(),
		queryFn: async () => {
			return clientApi.invite.getMany()
		},
	})

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
export function useSingleInvite({
	inviteId,
}: {
	inviteId: string
}): Pick<
	UseSuspenseQueryResult<InviteApi.Invite>,
	'data' | 'error' | 'isRefetching'
> {
	const clientApi = useClientApi()

	const { data, error, isRefetching } = useSuspenseQuery({
		...baseQueryOptions(),
		queryKey: getInvitesByIdQueryKey({ inviteId }),
		queryFn: async () => {
			return clientApi.invite.getById(inviteId)
		},
	})

	return { data, error, isRefetching }
}

/**
 * Accept an invite that has been received.
 */
export function useAcceptInvite(): UseMutationResult<
	string,
	Error,
	{ inviteId: string }
> {
	const queryClient = useQueryClient()
	const clientApi = useClientApi()

	return useMutation({
		...baseMutationOptions(),
		mutationFn: async ({ inviteId }) => {
			return clientApi.invite.accept({ inviteId })
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: getInvitesQueryKey(),
			})
			queryClient.invalidateQueries({
				queryKey: getProjectsQueryKey(),
			})
		},
	})
}

/**
 * Reject an invite that has been received.
 */
export function useRejectInvite(): UseMutationResult<
	string,
	Error,
	{ inviteId: string }
> {
	const queryClient = useQueryClient()
	const clientApi = useClientApi()

	return useMutation({
		...baseMutationOptions(),
		mutationFn: async ({ inviteId }) => {
			return clientApi.invite.accept({ inviteId })
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: getInvitesQueryKey(),
			})
			queryClient.invalidateQueries({
				queryKey: getProjectsQueryKey(),
			})
		},
	})
}

/**
 * Send an invite for a project.
 *
 * @param opts.projectId Public ID of project to send the invite on behalf of.
 */
export function useSendInvite({
	projectId,
}: {
	projectId: string
}): UseMutationResult<
	'ACCEPT' | 'REJECT' | 'ALREADY',
	Error,
	{
		deviceId: string
		roleDescription?: string
		roleId: MemberApi.RoleIdForNewInvite
		roleName?: string
	}
> {
	const queryClient = useQueryClient()
	const { data: projectApi } = useSingleProject({ projectId })

	return useMutation({
		...baseMutationOptions(),
		mutationFn: async ({ deviceId, ...role }) => {
			return projectApi.$member.invite(deviceId, role)
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: getInvitesQueryKey(),
			})
			queryClient.invalidateQueries({
				queryKey: getMembersQueryKey({ projectId }),
			})
		},
	})
}

/**
 * Request a cancellation of an invite sent to another device.
 *
 * @param opts.projectId Public ID of project to request the invite cancellation for.
 */
export function useRequestCancelInvite({
	projectId,
}: {
	projectId: string
}): UseMutationResult<void, Error, { deviceId: string }> {
	const queryClient = useQueryClient()
	const { data: projectApi } = useSingleProject({ projectId })

	return useMutation({
		...baseMutationOptions(),
		mutationFn: async ({ deviceId }) => {
			return projectApi.$member.requestCancelInvite(deviceId)
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: getInvitesQueryKey(),
			})
		},
	})
}

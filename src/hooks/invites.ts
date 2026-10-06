import type { InviteApi, InviteLinkJoiner, MemberApi } from '@comapeo/core'
import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
	type UseMutationResult,
	type UseSuspenseQueryResult,
} from '@tanstack/react-query'

import {
	baseMutationOptions,
	baseQueryOptions,
	filterMutationResult,
	getInvitesByIdQueryKey,
	getInvitesQueryKey,
	getJoinRequestsByIdQueryKey,
	getJoinRequestsQueryKey,
	getMembersQueryKey,
	getProjectByIdQueryKey,
	getProjectsQueryKey,
	type FilteredMutationResult,
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
export function useManyInvites(): // NOTE: Needs explicit return type due to TS2742
Pick<
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
}): // NOTE: Needs explicit return type due to TS2742
Pick<
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
export function useAcceptInvite() {
	const queryClient = useQueryClient()
	const clientApi = useClientApi()

	return filterMutationResult(
		useMutation({
			...baseMutationOptions(),
			mutationFn: async ({ inviteId }: { inviteId: string }) => {
				return clientApi.invite.accept({ inviteId })
			},
			onSuccess: (projectId) => {
				queryClient.invalidateQueries({
					queryKey: getInvitesQueryKey(),
				})
				// Accepting an invite (re-)adds the project on the backend, which
				// closes any project instance that was open before the invite (e.g.
				// after leaving the project) and opens a fresh one. The project
				// client is cached with staleTime/gcTime Infinity, so drop it here
				// or every observer keeps using the closed instance.
				queryClient.removeQueries({
					queryKey: getProjectByIdQueryKey({ projectId }),
					exact: true,
				})
				queryClient.invalidateQueries({
					queryKey: getProjectsQueryKey(),
				})
			},
		}),
	)
}

/**
 * Reject an invite that has been received.
 */
export function useRejectInvite() {
	const queryClient = useQueryClient()
	const clientApi = useClientApi()

	return filterMutationResult(
		useMutation({
			...baseMutationOptions(),
			mutationFn: async ({ inviteId }: { inviteId: string }) => {
				return clientApi.invite.reject({ inviteId })
			},
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: getInvitesQueryKey(),
				})
			},
		}),
	)
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
}): // NOTE: Needs explicit return type due to TS struggles with inference (TS 2883)
FilteredMutationResult<
	UseMutationResult<
		MemberApi.InviteDecision,
		Error,
		{
			deviceId: string
			roleDescription?: string
			roleId: MemberApi.RoleIdForNewInvite
			roleName?: string
		}
	>
> {
	const queryClient = useQueryClient()
	const { data: projectApi } = useSingleProject({ projectId })

	return filterMutationResult(
		useMutation({
			...baseMutationOptions(),
			mutationFn: async ({
				deviceId,
				...role
			}: {
				deviceId: string
				roleDescription?: string
				roleId: MemberApi.RoleIdForNewInvite
				roleName?: string
			}) => {
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
		}),
	)
}

/**
 * Request a cancellation of an invite sent to another device.
 *
 * @param opts.projectId Public ID of project to request the invite cancellation for.
 */
export function useRequestCancelInvite({ projectId }: { projectId: string }) {
	const queryClient = useQueryClient()
	const { data: projectApi } = useSingleProject({ projectId })

	return filterMutationResult(
		useMutation({
			...baseMutationOptions(),
			mutationFn: async ({ deviceId }: { deviceId: string }) => {
				return projectApi.$member.requestCancelInvite(deviceId)
			},
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: getInvitesQueryKey(),
				})
			},
		}),
	)
}

export function useManyJoinRequests(): // NOTE: Needs explicit return type due to TS2742
Pick<
	UseSuspenseQueryResult<Array<InviteLinkJoiner.JoinRequest>>,
	'data' | 'error' | 'isRefetching'
> {
	const clientApi = useClientApi()

	const { data, error, isRefetching } = useSuspenseQuery({
		...baseQueryOptions(),
		queryKey: getJoinRequestsQueryKey(),
		queryFn: async () => {
			return clientApi.inviteLinks.getJoinRequests()
		},
	})

	return { data, error, isRefetching }
}

export function useSingleJoinRequest({
	inviteId,
}: {
	inviteId: string
}): // NOTE: Needs explicit return type due to TS2742
Pick<
	UseSuspenseQueryResult<InviteLinkJoiner.JoinRequest>,
	'data' | 'error' | 'isRefetching'
> {
	const clientApi = useClientApi()

	const { data, error, isRefetching } = useSuspenseQuery({
		...baseQueryOptions(),
		queryKey: getJoinRequestsByIdQueryKey({ inviteId }),
		queryFn: async () => {
			return clientApi.inviteLinks.getJoinRequestById(inviteId)
		},
	})

	return { data, error, isRefetching }
}

export function useCreateJoinRequest(): // NOTE: Needs explicit return type due to TS struggles with inference (TS2883)
FilteredMutationResult<
	UseMutationResult<
		InviteLinkJoiner.JoinRequest,
		Error,
		{ url: string; timeout?: number }
	>
> {
	const clientApi = useClientApi()

	return filterMutationResult(
		useMutation({
			...baseMutationOptions(),
			mutationFn: async ({
				url,
				timeout,
			}: {
				url: string
				timeout?: number
			}) => {
				// Have to avoid passing `undefined` explicitly
				// See https://github.com/digidem/rpc-reflector/issues/21
				return timeout === undefined
					? clientApi.inviteLinks.createJoinRequest(url)
					: clientApi.inviteLinks.createJoinRequest(url, { timeout })
			},
			onSuccess: async (_data, _variables, _onMutateResult, context) => {
				context.client.invalidateQueries({
					queryKey: getJoinRequestsQueryKey(),
				})
			},
		}),
	)
}

export function useCancelJoinRequest(): // NOTE: Needs explicit return type due to TS struggles with inference (TS2883)
FilteredMutationResult<
	UseMutationResult<void, Error, { url: string; reason?: Error }>
> {
	const clientApi = useClientApi()

	return filterMutationResult(
		useMutation({
			...baseMutationOptions(),
			mutationFn: async ({ url, reason }: { url: string; reason?: Error }) => {
				// Have to avoid passing `undefined` explicitly
				// See https://github.com/digidem/rpc-reflector/issues/21
				return reason === undefined
					? clientApi.inviteLinks.cancelJoinRequest(url, reason)
					: clientApi.inviteLinks.cancelJoinRequest(url)
			},
			onSuccess: async (_data, _variables, _onMutateResult, context) => {
				context.client.invalidateQueries({
					queryKey: getJoinRequestsQueryKey(),
				})
			},
		}),
	)
}

import type { MemberApi } from '@comapeo/core' with { 'resolution-mode': 'import' }
import type {
	MapeoClientApi,
	MapeoProjectApi,
} from '@comapeo/ipc' with { 'resolution-mode': 'import' }
import {
	queryOptions,
	type QueryClient,
	type UseMutationOptions,
} from '@tanstack/react-query'

import { getMembersQueryKey, getProjectsQueryKey } from './projects.js'
import {
	baseMutationOptions,
	baseQueryOptions,
	ROOT_QUERY_KEY,
} from './shared.js'

export function getInvitesQueryKey() {
	return [ROOT_QUERY_KEY, 'invites'] as const
}

export function getInvitesByIdQueryKey({ inviteId }: { inviteId: string }) {
	return [ROOT_QUERY_KEY, 'invites', { inviteId }] as const
}

export function getInvitesQueryOptions({
	clientApi,
}: {
	clientApi: MapeoClientApi
}) {
	return queryOptions({
		...baseQueryOptions(),
		queryKey: getInvitesQueryKey(),
		queryFn: async () => {
			return clientApi.invite.getMany()
		},
	})
}

export function getInviteByIdQueryOptions({
	clientApi,
	inviteId,
}: {
	clientApi: MapeoClientApi
	inviteId: string
}) {
	return queryOptions({
		...baseQueryOptions(),
		queryKey: getInvitesByIdQueryKey({ inviteId }),
		queryFn: async () => {
			return clientApi.invite.getById(inviteId)
		},
	})
}

export function acceptInviteMutationOptions({
	clientApi,
	queryClient,
}: {
	clientApi: MapeoClientApi
	queryClient: QueryClient
}) {
	return {
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
	} satisfies UseMutationOptions<string, Error, { inviteId: string }>
}

export function rejectInviteMutationOptions({
	clientApi,
	queryClient,
}: {
	clientApi: MapeoClientApi
	queryClient: QueryClient
}) {
	return {
		...baseMutationOptions(),
		mutationFn: async ({ inviteId }: { inviteId: string }) => {
			return clientApi.invite.reject({ inviteId })
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: getInvitesQueryKey(),
			})
		},
	} satisfies UseMutationOptions<void, Error, { inviteId: string }>
}

export function sendInviteMutationOptions({
	projectApi,
	projectId,
	queryClient,
}: {
	projectApi: MapeoProjectApi
	projectId: string
	queryClient: QueryClient
}) {
	return {
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
	} satisfies UseMutationOptions<
		'ACCEPT' | 'REJECT' | 'ALREADY',
		Error,
		{
			deviceId: string
			roleDescription?: string
			roleId: MemberApi.RoleIdForNewInvite
			roleName?: string
		}
	>
}

export function requestCancelInviteMutationOptions({
	projectApi,
	queryClient,
}: {
	projectApi: MapeoProjectApi
	queryClient: QueryClient
}) {
	return {
		...baseMutationOptions(),
		mutationFn: async ({ deviceId }) => {
			return projectApi.$member.requestCancelInvite(deviceId)
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: getInvitesQueryKey(),
			})
		},
	} satisfies UseMutationOptions<void, Error, { deviceId: string }>
}

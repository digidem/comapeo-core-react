import type { RoleIdForNewInvite } from '@comapeo/core/dist/roles.js' with { 'resolution-mode': 'import' }
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

export function getPendingInvitesQueryKey() {
	return [ROOT_QUERY_KEY, 'invites', { status: 'pending' }] as const
}

export function pendingInvitesQueryOptions({
	clientApi,
}: {
	clientApi: MapeoClientApi
}) {
	return queryOptions({
		...baseQueryOptions(),
		queryKey: getPendingInvitesQueryKey(),
		queryFn: async () => {
			return clientApi.invite.getPending()
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
			roleId: RoleIdForNewInvite
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

import { RoleIdForNewInvite } from '@comapeo/core/dist/roles.js'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { getInvitesQueryKey } from '../lib/react-query/invites.js'
import {
	getMembersQueryKey,
	getProjectsQueryKey,
} from '../lib/react-query/projects.js'
import { useClientApi } from './client.js'
import { useSingleProject } from './projects.js'

export function useAcceptInvite() {
	const queryClient = useQueryClient()
	const clientApi = useClientApi()

	const { mutate, status, reset } = useMutation({
		mutationFn: async ({ inviteId }: { inviteId: string }) => {
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

	return {
		mutate,
		reset,
		status,
	}
}

export function useRejectInvite() {
	const queryClient = useQueryClient()
	const clientApi = useClientApi()

	const { mutate, status, reset } = useMutation({
		mutationFn: async ({ inviteId }: { inviteId: string }) => {
			return clientApi.invite.reject({ inviteId })
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: getInvitesQueryKey(),
			})
		},
	})

	return {
		mutate,
		reset,
		status,
	}
}

export function useSendInvite({ projectId }: { projectId: string }) {
	const queryClient = useQueryClient()
	const projectApi = useSingleProject({ projectId })

	const { mutate, status, reset } = useMutation({
		mutationFn: async ({
			deviceId,
			...role
		}: {
			deviceId: string
			roleDescription?: string
			roleId: RoleIdForNewInvite
			roleName?: string
		}) => {
			return projectApi.data.$member.invite(deviceId, role)
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

	return {
		mutate,
		reset,
		status,
	}
}

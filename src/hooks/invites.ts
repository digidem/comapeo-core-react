import { useMutation, useQueryClient } from '@tanstack/react-query'

import { getInvitesQueryKey } from '../lib/react-query/invites.js'
import { getProjectsQueryKey } from '../lib/react-query/projects.js'
import { useClientApi } from './client.js'

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

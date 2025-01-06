import type { RoleIdForNewInvite } from '@comapeo/core/dist/roles.js' with { 'resolution-mode': 'import' }
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { getInvitesQueryKey } from '../lib/react-query/invites.js'
import {
	getMembersQueryKey,
	getProjectsQueryKey,
} from '../lib/react-query/projects.js'
import { useClientApi } from './client.js'
import { useSingleProject } from './projects.js'

/**
 * Accept an invite that has been received.
 */
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

	return { mutate, reset, status }
}

/**
 * Reject an invite that has been received.
 */
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

	return { mutate, reset, status }
}

/**
 * Send an invite for a project.
 *
 * @param opts.projectId Public ID of project to send the invite on behalf of.
 */
export function useSendInvite({ projectId }: { projectId: string }) {
	const queryClient = useQueryClient()
	const { data: projectApi } = useSingleProject({ projectId })

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

	return { mutate, reset, status }
}

/**
 * Request a cancellation of an invite sent to another device.
 *
 * @param opts.projectId Public ID of project to request the invite cancellation for.
 */
export function useRequestCancelInvite({ projectId }: { projectId: string }) {
	const queryClient = useQueryClient()
	const { data: projectApi } = useSingleProject({ projectId })

	const { mutate, status, reset } = useMutation({
		mutationFn: async ({ deviceId }: { deviceId: string }) => {
			return projectApi.$member.requestCancelInvite(deviceId)
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: getInvitesQueryKey(),
			})
		},
	})

	return { mutate, reset, status }
}

import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
	acceptInviteMutationOptions,
	rejectInviteMutationOptions,
	requestCancelInviteMutationOptions,
	sendInviteMutationOptions,
} from '../lib/react-query/invites.js'
import { useClientApi } from './client.js'
import { useSingleProject } from './projects.js'

/**
 * Accept an invite that has been received.
 */
export function useAcceptInvite() {
	const queryClient = useQueryClient()
	const clientApi = useClientApi()

	const { mutate, status, reset } = useMutation(
		acceptInviteMutationOptions({ clientApi, queryClient }),
	)

	return { mutate, reset, status }
}

/**
 * Reject an invite that has been received.
 */
export function useRejectInvite() {
	const queryClient = useQueryClient()
	const clientApi = useClientApi()

	const { mutate, status, reset } = useMutation(
		rejectInviteMutationOptions({ clientApi, queryClient }),
	)

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

	const { mutate, status, reset } = useMutation(
		sendInviteMutationOptions({ projectApi, projectId, queryClient }),
	)

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

	const { mutate, status, reset } = useMutation(
		requestCancelInviteMutationOptions({ projectApi, queryClient }),
	)

	return { mutate, reset, status }
}

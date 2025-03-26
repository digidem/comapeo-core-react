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

	const { error, mutate, reset, status } = useMutation(
		acceptInviteMutationOptions({ clientApi, queryClient }),
	)

	return status === 'error'
		? { error, mutate, reset, status }
		: { error: null, mutate, reset, status }
}

/**
 * Reject an invite that has been received.
 */
export function useRejectInvite() {
	const queryClient = useQueryClient()
	const clientApi = useClientApi()

	const { error, mutate, reset, status } = useMutation(
		rejectInviteMutationOptions({ clientApi, queryClient }),
	)

	return status === 'error'
		? { error, mutate, reset, status }
		: { error: null, mutate, reset, status }
}

/**
 * Send an invite for a project.
 *
 * @param opts.projectId Public ID of project to send the invite on behalf of.
 */
export function useSendInvite({ projectId }: { projectId: string }) {
	const queryClient = useQueryClient()
	const { data: projectApi } = useSingleProject({ projectId })

	const { error, mutate, reset, status } = useMutation(
		sendInviteMutationOptions({ projectApi, projectId, queryClient }),
	)

	return status === 'error'
		? { error, mutate, reset, status }
		: { error: null, mutate, reset, status }
}

/**
 * Request a cancellation of an invite sent to another device.
 *
 * @param opts.projectId Public ID of project to request the invite cancellation for.
 */
export function useRequestCancelInvite({ projectId }: { projectId: string }) {
	const queryClient = useQueryClient()
	const { data: projectApi } = useSingleProject({ projectId })

	const { error, mutate, reset, status } = useMutation(
		requestCancelInviteMutationOptions({ projectApi, queryClient }),
	)

	return status === 'error'
		? { error, mutate, reset, status }
		: { error: null, mutate, reset, status }
}

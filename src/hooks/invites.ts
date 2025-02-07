import type {
	Invite,
	InviteRemovalReason,
} from '@comapeo/core/dist/invite-api.js'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useContext, useEffect, useRef } from 'react'

import { ClientApiContext } from '../contexts/ClientApi.js'
import {
	acceptInviteMutationOptions,
	rejectInviteMutationOptions,
	requestCancelInviteMutationOptions,
	sendInviteMutationOptions,
} from '../lib/react-query/invites.js'
import { useClientApi } from './client.js'
import { useSingleProject } from './projects.js'

export function usePendingInviteStore() {
	const contextValue = useContext(ClientApiContext)
	if (!contextValue) {
		throw new Error(
			'No client API set. Make sure you set up the ClientApiContext provider properly',
		)
	}
	return contextValue.pendingInviteStore
}

export function usePendingInviteListener(
	listener: (invite: Invite) => void,
): void {
	// Always use the most recent version of the listener inside the effect,
	// without memoization so the listeners don't have to be swapped with every render.
	const listenerRef = useRef(listener)
	listenerRef.current = listener
	const lastPendingInvite = useRef<Invite | null>(null)
	const pendingInviteStore = usePendingInviteStore()

	useEffect(() => {
		const callback = () => {
			const invite = pendingInviteStore.getSnapshot()
			if (invite && invite !== lastPendingInvite.current) {
				listenerRef.current(invite)
			}
			lastPendingInvite.current = invite
		}
		return pendingInviteStore.subscribe(callback)
	}, [pendingInviteStore])
}

export function useCancelledInviteListener(
	listener: (invite: Invite) => void,
): void {
	const listenerRef = useRef(listener)
	listenerRef.current = listener
	const clientApi = useClientApi()

	useEffect(() => {
		const callback = (invite: Invite, reason: InviteRemovalReason) => {
			if (reason === 'canceled') {
				listenerRef.current(invite)
			}
		}
		clientApi.invite.on('invite-removed', callback)
		return () => {
			clientApi.invite.off('invite-removed', callback)
		}
	}, [clientApi])
}

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

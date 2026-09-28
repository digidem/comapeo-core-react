import type { ComapeoCoreClientApi } from '@comapeo/ipc'
import { useQueryClient } from '@tanstack/react-query'
import {
	createContext,
	createElement,
	useEffect,
	type Context,
	type JSX,
	type PropsWithChildren,
} from 'react'

import {
	getInvitesQueryKey,
	getJoinRequestsQueryKey,
} from '../lib/react-query.js'

export const ClientApiContext: Context<ComapeoCoreClientApi | null> =
	createContext<ComapeoCoreClientApi | null>(null)

export type ClientApiProviderProps = PropsWithChildren<{
	clientApi: ComapeoCoreClientApi
}>

/**
 * Create a context provider that holds a CoMapeo API client instance.
 *
 * @param opts.children React children node
 * @param opts.clientApi Client API instance
 *
 */
export function ClientApiProvider({
	children,
	clientApi,
}: ClientApiProviderProps): JSX.Element {
	const queryClient = useQueryClient()

	useEffect(() => {
		function handleInviteEvent() {
			queryClient.invalidateQueries({ queryKey: getInvitesQueryKey() })
		}

		clientApi.invite.addListener('invite-received', handleInviteEvent)
		clientApi.invite.addListener('invite-updated', handleInviteEvent)

		function handleJoinRequestUpdateEvent() {
			queryClient.invalidateQueries({ queryKey: getJoinRequestsQueryKey() })
		}

		clientApi.inviteLinks.addListener(
			'join-request-update',
			handleJoinRequestUpdateEvent,
		)

		return () => {
			clientApi.invite.removeListener('invite-received', handleInviteEvent)
			clientApi.invite.removeListener('invite-updated', handleInviteEvent)

			clientApi.inviteLinks.removeListener(
				'join-request-update',
				handleJoinRequestUpdateEvent,
			)
		}
	}, [clientApi, queryClient])

	return createElement(
		ClientApiContext.Provider,
		{ value: clientApi },
		children,
	)
}

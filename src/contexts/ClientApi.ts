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

import { getInvitesQueryKey } from '../lib/react-query.js'

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
		function invalidateInviteCache() {
			queryClient.invalidateQueries({ queryKey: getInvitesQueryKey() })
		}

		// Invite listeners
		clientApi.invite.addListener('invite-received', invalidateInviteCache)
		clientApi.invite.addListener('invite-updated', invalidateInviteCache)

		return () => {
			clientApi.invite.removeListener('invite-received', invalidateInviteCache)
			clientApi.invite.removeListener('invite-updated', invalidateInviteCache)
		}
	}, [clientApi, queryClient])

	return createElement(
		ClientApiContext.Provider,
		{ value: clientApi },
		children,
	)
}

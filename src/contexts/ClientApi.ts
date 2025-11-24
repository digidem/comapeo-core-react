import type { MapeoClientApi } from '@comapeo/ipc' with { 'resolution-mode': 'import' }
import { useQueryClient } from '@tanstack/react-query'
import {
	createContext,
	createElement,
	useEffect,
	type Context,
	type JSX,
	type ReactNode,
} from 'react'

import { getInvitesQueryKey } from '../lib/react-query/invites.js'

export const ClientApiContext: Context<MapeoClientApi | null> =
	createContext<MapeoClientApi | null>(null)

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
}: {
	children: ReactNode
	clientApi: MapeoClientApi
}): JSX.Element {
	const queryClient = useQueryClient()

	useEffect(() => {
		function invalidateCache() {
			queryClient.invalidateQueries({ queryKey: getInvitesQueryKey() })
		}

		clientApi.invite.addListener('invite-received', invalidateCache)
		clientApi.invite.addListener('invite-updated', invalidateCache)

		return () => {
			clientApi.invite.removeListener('invite-received', invalidateCache)
			clientApi.invite.removeListener('invite-updated', invalidateCache)
		}
	}, [clientApi, queryClient])

	return createElement(
		ClientApiContext.Provider,
		{ value: clientApi },
		children,
	)
}

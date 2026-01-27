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
import { getMapSharesQueryKey } from '../lib/react-query/maps.js'

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
		function invalidateInviteCache() {
			queryClient.invalidateQueries({ queryKey: getInvitesQueryKey() })
		}

		function invalidateMapShareCache() {
			queryClient.invalidateQueries({ queryKey: getMapSharesQueryKey() })
		}

		// Invite listeners
		clientApi.invite.addListener('invite-received', invalidateInviteCache)
		clientApi.invite.addListener('invite-updated', invalidateInviteCache)

		// Map share listeners
		// TODO: These events need to be implemented in @comapeo/core
		// Using type assertion until the events are added to the API
		const clientApiWithMapShare = clientApi as MapeoClientApi & {
			addListener: (
				event: 'map-share-received' | 'map-share-cancelled',
				handler: () => void,
			) => void
			removeListener: (
				event: 'map-share-received' | 'map-share-cancelled',
				handler: () => void,
			) => void
		}
		clientApiWithMapShare.addListener(
			'map-share-received',
			invalidateMapShareCache,
		)
		clientApiWithMapShare.addListener(
			'map-share-cancelled',
			invalidateMapShareCache,
		)

		return () => {
			clientApi.invite.removeListener('invite-received', invalidateInviteCache)
			clientApi.invite.removeListener('invite-updated', invalidateInviteCache)
			clientApiWithMapShare.removeListener(
				'map-share-received',
				invalidateMapShareCache,
			)
			clientApiWithMapShare.removeListener(
				'map-share-cancelled',
				invalidateMapShareCache,
			)
		}
	}, [clientApi, queryClient])

	return createElement(
		ClientApiContext.Provider,
		{ value: clientApi },
		children,
	)
}

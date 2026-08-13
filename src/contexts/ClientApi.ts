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

import { getInvitesQueryKey, getRootQueryKey } from '../lib/react-query.js'

export const ClientApiContext: Context<ComapeoCoreClientApi | null> =
	createContext<ComapeoCoreClientApi | null>(null)

export type ClientApiProviderProps = PropsWithChildren<{
	clientApi: ComapeoCoreClientApi
	/**
	 * Subscribe to notifications that the CoMapeo backend restarted, so that
	 * cached data pointing at the previous backend instance can be discarded.
	 *
	 * A "restart" means the backend lost all of its in-memory state and came
	 * back as a fresh instance — for example on Android, where the backend runs
	 * in its own OS process that the system can kill under memory pressure and
	 * later restart while the app keeps running. It does *not* mean a dropped
	 * and re-established transport connection to a backend that is still alive.
	 *
	 * The listener should be called after the RPC transport has reconnected to
	 * the new backend, i.e. once requests made on it will reach the new
	 * instance.
	 *
	 * Platforms whose backend cannot outlive the app (desktop, where the backend
	 * dying exits the app) should omit this prop.
	 *
	 * @param listener Called each time the backend has restarted
	 * @returns A function that removes the listener
	 *
	 * @example
	 * ```tsx
	 * <ComapeoCoreProvider
	 *   subscribeToBackendRestart={(listener) => {
	 *     backend.on('restart', listener)
	 *     return () => backend.off('restart', listener)
	 *   }}
	 * />
	 * ```
	 */
	subscribeToBackendRestart?: (listener: () => void) => () => void
}>

/**
 * Create a context provider that holds a CoMapeo API client instance.
 *
 * @param opts.children React children node
 * @param opts.clientApi Client API instance
 * @param opts.subscribeToBackendRestart Optional subscribe function for backend-restart notifications
 *
 */
export function ClientApiProvider({
	children,
	clientApi,
	subscribeToBackendRestart,
}: ClientApiProviderProps): JSX.Element {
	const queryClient = useQueryClient()

	useEffect(() => {
		if (!subscribeToBackendRestart) return

		return subscribeToBackendRestart(() => {
			// Everything we cache is derived from the backend, including project
			// client proxies bound to a per-project channel that the restart tore
			// down, so drop the lot.
			queryClient.invalidateQueries({ queryKey: getRootQueryKey() })
		})
	}, [subscribeToBackendRestart, queryClient])

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

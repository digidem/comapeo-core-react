import type { MapeoClientApi } from '@comapeo/ipc' with { 'resolution-mode': 'import' }
import { createContext, createElement, useRef, type ReactNode } from 'react'

import { PendingInviteStore } from '../lib/pending-invite-store.js'

type ClientApiContextValue = {
	clientApi: MapeoClientApi
	pendingInviteStore: PendingInviteStore
} | null

export const ClientApiContext = createContext<ClientApiContextValue>(null)

/**
 * Create a context provider that holds a CoMapeo API client instance.
 *
 * @param opts
 * @param {ReactNode} opts.children React children node
 * @param {MapeoClientApi} opts.clientApi Client API instance
 */
export function ClientApiProvider({
	children,
	clientApi,
}: {
	children: ReactNode
	clientApi: MapeoClientApi
}) {
	const valueRef = useRef<ClientApiContextValue>(null)
	if (valueRef.current === null) {
		// This is ok to do, see https://web.archive.org/web/20250128072444/https://react.dev/reference/react/useRef#expand
		valueRef.current = {
			clientApi,
			pendingInviteStore: new PendingInviteStore(clientApi),
		}
	}
	if (valueRef.current.clientApi !== clientApi) {
		throw new Error('Client API instance must be stable')
	}
	return createElement(
		ClientApiContext.Provider,
		{ value: valueRef.current },
		children,
	)
}

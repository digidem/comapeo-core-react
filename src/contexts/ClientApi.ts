import type { MapeoClientApi } from '@comapeo/ipc' with { 'resolution-mode': 'import' }
import { createContext, createElement, type ReactNode } from 'react'

export const ClientApiContext = createContext<MapeoClientApi | null>(null)

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
	return createElement(
		ClientApiContext.Provider,
		{ value: clientApi },
		children,
	)
}

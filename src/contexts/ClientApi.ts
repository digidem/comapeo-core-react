import type { MapeoClientApi } from '@comapeo/ipc' with { 'resolution-mode': 'import' }
import {
	createContext,
	createElement,
	type Context,
	type JSX,
	type ReactNode,
} from 'react'

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
	return createElement(
		ClientApiContext.Provider,
		{ value: clientApi },
		children,
	)
}

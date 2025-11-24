import type { MapeoClientApi } from '@comapeo/ipc' with { 'resolution-mode': 'import' }
import {
	createContext,
	createElement,
	useContext,
	useMemo,
	useRef,
	type Context,
	type JSX,
	type ReactNode,
	type RefObject,
} from 'react'

type ClientApiContextType = null | {
	clientApi: MapeoClientApi
	inviteListenerCountRef: RefObject<number>
}

export const ClientApiContext: Context<ClientApiContextType> =
	createContext<ClientApiContextType>(null)

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
	const inviteListenerCountRef = useRef(0)
	const value = useMemo(
		() => ({
			clientApi,
			inviteListenerCountRef,
		}),
		[clientApi],
	)
	return createElement(ClientApiContext.Provider, { value }, children)
}

export function useClientApiContext(): Exclude<ClientApiContextType, null> {
	const contextValue = useContext(ClientApiContext)

	if (!contextValue) {
		throw new Error(
			'No client API set. Make sure you set up the ClientApiContext provider properly',
		)
	}

	return contextValue
}

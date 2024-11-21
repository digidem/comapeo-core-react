import type { MapeoClientApi } from '@comapeo/ipc'
import {
	createContext,
	createElement,
	useContext,
	type PropsWithChildren,
} from 'react'

export const ClientApiContext = createContext<MapeoClientApi | null>(null)

export function ClientApiProvider({
	children,
	clientApi,
}: PropsWithChildren<{ clientApi: MapeoClientApi }>) {
	return createElement(
		ClientApiContext.Provider,
		{ value: clientApi },
		children,
	)
}

export function useClientApi() {
	const clientApi = useContext(ClientApiContext)

	if (!clientApi) {
		throw new Error(
			'No client API set. Make sure you set up the ClientApiContext provider properly',
		)
	}

	return clientApi
}

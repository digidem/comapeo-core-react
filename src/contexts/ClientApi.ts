import type { MapeoClientApi } from '@comapeo/ipc'
import { createContext, createElement, type PropsWithChildren } from 'react'

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

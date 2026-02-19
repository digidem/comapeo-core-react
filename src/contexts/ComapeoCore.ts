import { createElement, type JSX } from 'react'

import { ClientApiProvider, type ClientApiProviderProps } from './ClientApi.js'
import { MapServerProvider, type MapServerProviderProps } from './MapServer.js'

type ComapeoCoreProviderProps = ClientApiProviderProps &
	Omit<MapServerProviderProps, 'getBaseUrl'> & {
		getMapServerBaseUrl(): Promise<URL>
	}

export function ComapeoCoreProvider({
	children,
	clientApi,
	getMapServerBaseUrl,
	fetch,
	queryClient,
}: ComapeoCoreProviderProps): JSX.Element {
	return createElement(
		ClientApiProvider,
		{ clientApi },
		createElement(
			MapServerProvider,
			{ getBaseUrl: getMapServerBaseUrl, fetch, queryClient },
			children,
		),
	)
}

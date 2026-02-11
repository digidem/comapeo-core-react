import {
	createEventSource,
	type EventSourceClient,
	type EventSourceOptions,
} from 'eventsource-client'
import ky, { type KyInstance } from 'ky'
import {
	createContext,
	createElement,
	useContext,
	useMemo,
	type Context,
	type JSX,
	type PropsWithChildren,
} from 'react'

import { useClientApi } from '../hooks/client.js'
import {
	ReceivedMapSharesProvider,
	SentMapSharesProvider,
} from './MapShares.js'

export type MapServerApiOptions = {
	getBaseUrl(): Promise<URL>
	fetch?(
		input: string | URL | Request,
		options?: RequestInit,
	): Promise<Response>
}

export type MapServerApi = KyInstance & {
	createEventSource(options: EventSourceOptions): EventSourceClient
	getMapStyleJsonUrl(mapId: string): Promise<string>
}

// Placeholder URL used to allow ky to create Request objects with relative URLs in Node.js
const PLACEHOLDER_PREFIX = 'http://placeholder/'

/**
 * Utility function to create a MapServerApi instance.
 * Only exported for unit testing purposes.
 * @private
 *
 * @param opts.getBaseUrl A function that returns a promise that resolves to the base URL of the map server.
 * @param opts.fetch An optional custom fetch function to use for making requests to the map server. If not provided, the global `fetch` will be used.
 */
export function createMapServerApi({
	getBaseUrl,
	fetch = globalThis.fetch,
}: MapServerApiOptions): MapServerApi {
	const api = ky.create({
		prefixUrl: PLACEHOLDER_PREFIX,
		fetch,
		hooks: {
			beforeRequest: [
				async (request) => {
					const baseUrl = await getBaseUrl()
					const requestUrl = new URL(request.url)
					const realUrl = new URL(
						requestUrl.pathname + requestUrl.search,
						baseUrl,
					)
					return new Request(realUrl, request)
				},
			],
		},
	})
	Object.defineProperty(api, 'createEventSource', {
		value: (options: EventSourceOptions) => {
			return createEventSource({
				...options,
				fetch: async (input, init) => {
					const baseUrl = await getBaseUrl()
					return fetch(new URL(input, baseUrl), init)
				},
			})
		},
	})
	Object.defineProperty(api, 'getMapStyleJsonUrl', {
		value: async (mapId: string) => {
			const baseUrl = await getBaseUrl()
			return new URL(`/maps/${mapId}/style.json`, baseUrl).href
		},
	})
	return api as MapServerApi
}

export const MapServerContext: Context<MapServerApi | null> =
	createContext<MapServerApi | null>(null)

export type MapServerProviderProps = PropsWithChildren<MapServerApiOptions>

/**
 * Create a context provider that holds a `MapServerFetch` function, which waits
 * for the map server to be ready before making requests.
 *
 * @param opts.children React children node
 * @param opts.getBaseUrl A function that returns a promise that resolves to the base URL of the map server.
 * @param opts.fetch An optional custom fetch function to use for making requests to the map server. If not provided, the global `fetch` will be used.
 *
 * @example
 * ```tsx
 * import { createServer } from '@comapeo/map-server'
 *
 * const server = createServer()
 * const listenPromise = server.listen()
 *
 * const getBaseUrl = async () => {
 *   const { localPort } = await listenPromise
 *   return new URL(`http://localhost:${localPort}/`)
 * }
 *
 * const mapServerApi = createMapServerApi({ getBaseUrl })
 *
 * function App() {
 *   return (
 *     <MapServerProvider mapServerApi={mapServerApi}>
 *       <MyApp />
 *     </MapServerProvider>
 *   )
 * }
 * ```
 */
export function MapServerProvider({
	children,
	getBaseUrl,
	fetch,
}: MapServerProviderProps): JSX.Element {
	const clientApi = useClientApi()
	const mapServerApi = useMemo(
		() => createMapServerApi({ getBaseUrl, fetch }),
		[getBaseUrl, fetch],
	)
	return createElement(
		MapServerContext.Provider,
		{ value: mapServerApi },
		createElement(
			SentMapSharesProvider,
			{ clientApi, mapServerApi },
			createElement(
				ReceivedMapSharesProvider,
				{ clientApi, mapServerApi },
				children,
			),
		),
	)
}

/**
 * Internal hook to get the MapServerApi (instance of ky) from context.
 * Throws if used outside of MapServerProvider.
 */
export function useMapServerApi(): MapServerApi {
	const api = useContext(MapServerContext)
	if (!api) {
		throw new Error('useMapServerApi must be used within a MapServerProvider')
	}
	return api
}

import {
	createEventSource,
	type EventSourceClient,
	type EventSourceOptions,
} from 'eventsource-client'
import ky, { type KyInstance } from 'ky'
import React, {
	createContext,
	createElement,
	useContext,
	type Context,
	type JSX,
	type ReactNode,
} from 'react'

export type MapServerApiOptions = {
	getBaseUrl(): Promise<URL>
	fetch?(
		input: string | URL | Request,
		options?: RequestInit,
	): Promise<Response>
}

export type MapServerApi = KyInstance & {
	createEventSource(options: EventSourceOptions): EventSourceClient
}

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
		fetch,
		hooks: {
			beforeRequest: [
				async (request) => {
					const baseUrl = await getBaseUrl()
					return new Request(new URL(request.url, baseUrl), request)
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
	return api as MapServerApi
}

export const MapServerContext: Context<MapServerApi | null> =
	createContext<MapServerApi | null>(null)
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
 * function App() {
 *   return (
 *     <MapServerProvider getBaseUrl={getBaseUrl}>
 *       <MyApp />
 *     </MapServerProvider>
 *   )
 * }
 * ```
 */
export function MapServerProvider({
	children,
	getBaseUrl,
	fetch = globalThis.fetch,
}: MapServerApiOptions & { children: ReactNode }): JSX.Element {
	const value = React.useMemo(() => {
		return createMapServerApi({ getBaseUrl, fetch })
	}, [getBaseUrl, fetch])
	return createElement(MapServerContext.Provider, { value }, children)
}

/**
 * Internal hook to get the MapServerApi (instance of ky) from context.
 * Throws if used outside of MapServerProvider.
 */
export function useMapServerApi(): KyInstance {
	const api = useContext(MapServerContext)
	if (!api) {
		throw new Error('useMapServerApi must be used within a MapServerProvider')
	}
	return api
}

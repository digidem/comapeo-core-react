import { type QueryClient } from '@tanstack/react-query'
import {
	createEventSource,
	type EventSourceClient,
	type EventSourceOptions,
} from 'eventsource-client'
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
import { createHttp, HTTPError } from '../lib/http.js'
import {
	ReceivedMapSharesProvider,
	SentMapSharesProvider,
} from './MapShares.js'

// Expo's file-system File type is close to the standard File type, so for our
// import function we accept an object with the compatible properties and
// methods, and for the expo File, which can represent a file that does not yet
// exists, we type the `exists` property so that we can check that.
export type CompatFile = Omit<File, 'lastModified' | 'webkitRelativePath'>
export type ExpoFileDuckType = CompatFile & {
	exists: boolean
}

type ExpoFileUploadResult = {
	status: number
	headers: Record<string, string>
	body: string
}

type ExpoFileWithUpload = ExpoFileDuckType & {
	upload(
		url: string,
		options?: {
			headers?: Record<string, string>
			httpMethod?: string
			sessionType?: 'background' | 'foreground'
		},
	): Promise<ExpoFileUploadResult>
}

function isExpoFileWithUpload(
	file: CompatFile | ExpoFileDuckType,
): file is ExpoFileWithUpload {
	return 'upload' in file && typeof file.upload === 'function'
}

export type MapServerApiOptions = {
	getBaseUrl(): Promise<URL | string>
	/**
	 * We assume the passed fetch implementation will only accept a `string` as
	 * input, not a `URL` or `Request`, because right now the expo/fetch
	 * implementation will only accept a `string`. Adding this restriction will
	 * catch potential issues if we try to pass a URL in our code. Can be relaxed
	 * when https://github.com/expo/expo/issues/43193 is fixed upstream.
	 */
	fetch?(input: string, options?: RequestInit): Promise<Response>
}

export type MapServerApi = ReturnType<typeof createHttp> & {
	createEventSource(options: EventSourceOptions): EventSourceClient
	getMapStyleJsonUrl(mapId: string): Promise<string>
	uploadFile(
		path: string,
		file: CompatFile | ExpoFileDuckType,
		options?: { headers?: Record<string, string> },
	): Promise<Response>
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
	const wrappedFetch = async (input: string | URL, init?: RequestInit) => {
		const baseUrl = await getBaseUrl()
		return fetch(new URL(input, baseUrl).href, init)
	}
	const api = createHttp(wrappedFetch)
	Object.defineProperty(api, 'createEventSource', {
		value: (options: EventSourceOptions) => {
			return createEventSource({
				...options,
				fetch: async (input, init) => {
					const baseUrl = await getBaseUrl()
					return fetch(new URL(input, baseUrl).href, init)
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
	Object.defineProperty(api, 'uploadFile', {
		value: async (
			path: string,
			file: CompatFile | ExpoFileDuckType,
			options: { headers?: Record<string, string> } = {},
		): Promise<Response> => {
			if (!isExpoFileWithUpload(file)) {
				return api.put(path, { body: file, headers: options.headers })
			}
			// expo-file-system's File.upload() streams the file from disk, unlike
			// expo/fetch, which reads the whole request body into memory.
			const baseUrl = await getBaseUrl()
			const url = new URL(path, baseUrl).href
			const result = await file.upload(url, {
				httpMethod: 'PUT',
				headers: options.headers,
				// The map server runs in-process: an iOS background session (the
				// default), which outlives app suspension, cannot reach it.
				sessionType: 'foreground',
			})
			const canHaveBody = ![204, 205, 304].includes(result.status)
			const response = new Response(canHaveBody ? result.body : null, {
				status: result.status,
				headers: result.headers,
			})
			if (!response.ok) {
				let errorBody: Record<string, unknown> = {}
				try {
					const parsed: unknown = JSON.parse(result.body)
					if (typeof parsed === 'object' && parsed !== null) {
						errorBody = parsed as Record<string, unknown>
					}
				} catch {
					// Non-JSON error body: fall back to the default HTTPError message
				}
				throw new HTTPError(response, { method: 'PUT', url, ...errorBody })
			}
			return response
		},
	})
	return api as MapServerApi
}

export const MapServerContext: Context<MapServerApi | null> =
	createContext<MapServerApi | null>(null)

export type MapServerProviderProps = PropsWithChildren<
	MapServerApiOptions & { queryClient: QueryClient }
>

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
	queryClient,
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
				{ clientApi, mapServerApi, queryClient },
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

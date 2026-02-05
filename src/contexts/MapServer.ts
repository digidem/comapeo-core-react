import {
	createContext,
	createElement,
	useContext,
	type Context,
	type JSX,
	type ReactNode,
} from 'react'

type MapServerFetch = (path: string, options?: RequestInit) => Promise<Response>

export const MapServerContext: Context<MapServerFetch | null> =
	createContext<MapServerFetch | null>(null)

/**
 * Create a context provider that holds a `MapServerFetch` function, which waits
 * for the map server to be ready before making requests.
 *
 * @param opts.children React children node
 * @param opts.mapServerFetch `MapServerFetch` function
 *
 * @example
 * ```tsx
 * import { createServer } from '@comapeo/map-server'
 *
 * const server = createServer()
 * const listenPromise = server.listen()
 *
 * const mapServerFetch: MapServerFetch = async (path, options) => {
 *   const { localPort } = await listenPromise
 *   const url = `http://localhost:${localPort}${path}`
 *   return fetch(url, options)
 * }
 *
 * function App() {
 *   return (
 *     <MapServerProvider mapServerFetch={mapServerFetch}>
 *       <MyApp />
 *     </MapServerProvider>
 *   )
 * }
 * ```
 */
export function MapServerProvider({
	children,
	mapServerFetch,
}: {
	children: ReactNode
	mapServerFetch: MapServerFetch
}): JSX.Element {
	return createElement(
		MapServerContext.Provider,
		{ value: mapServerFetch },
		children,
	)
}

/**
 * Internal hook to get the MapServerFetch from context.
 * Throws if used outside of MapServerProvider.
 */
export function useMapServerFetch(): MapServerFetch {
	const fetch = useContext(MapServerContext)
	if (!fetch) {
		throw new Error('useMapServerFetch must be used within a MapServerProvider')
	}
	return fetch
}

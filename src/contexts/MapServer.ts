import {
	createContext,
	createElement,
	useContext,
	type Context,
	type JSX,
	type ReactNode,
} from 'react'

import { MapServerState } from '../lib/MapServerState.js'

export const MapServerContext: Context<MapServerState | null> =
	createContext<MapServerState | null>(null)

/**
 * Create a context provider that holds a `MapServerState` instance. Required for all map sharing hooks.
 *
 * @param opts.children React children node
 * @param opts.mapServerState `MapServerState` instance created via `createMapServerState()`
 *
 * @example
 * ```tsx
 * import { createMapServerState, MapServerProvider } from '@comapeo/core-react'
 *
 * const mapServerState = createMapServerState()
 *
 * // When map server starts:
 * mapServerState.setPort(8080)
 *
 * function App() {
 *   return (
 *     <MapServerProvider mapServerState={mapServerState}>
 *       <MyApp />
 *     </MapServerProvider>
 *   )
 * }
 * ```
 */
export function MapServerProvider({
	children,
	mapServerState,
}: {
	children: ReactNode
	mapServerState: MapServerState
}): JSX.Element {
	return createElement(
		MapServerContext.Provider,
		{ value: mapServerState },
		children,
	)
}

/**
 * Internal hook to get the MapServerState from context.
 * Throws if used outside of MapServerProvider.
 */
export function useMapServerState(): MapServerState {
	const state = useContext(MapServerContext)
	if (!state) {
		throw new Error('useMapServerState must be used within a MapServerProvider')
	}
	return state
}

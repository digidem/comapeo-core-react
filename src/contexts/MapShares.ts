import type { MapShare } from '@comapeo/core'
import type { MapeoClientApi } from '@comapeo/ipc'
import {
	createContext,
	createElement,
	useContext,
	useEffect,
	useState,
	type Context,
	type JSX,
	type ReactNode,
} from 'react'

import {
	createMapSharesStore,
	type MapSharesStore,
} from '../lib/received-map-shares-store.js'

export const MapSharesContext: Context<MapSharesStore | null> =
	createContext<MapSharesStore | null>(null)

export function MapSharesProvider({
	children,
	clientApi,
}: {
	children: ReactNode
	clientApi: MapeoClientApi
}): JSX.Element {
	const [mapSharesStore] = useState(() => createMapSharesStore())

	useEffect(() => {
		function handleMapShare(mapShare: MapShare) {
			mapSharesStore.add(mapShare)
		}

		clientApi.on('map-share', handleMapShare)
		return () => {
			clientApi.off('map-share', handleMapShare)
		}
	}, [clientApi, mapSharesStore])
	return createElement(
		MapSharesContext.Provider,
		{ value: mapSharesStore },
		children,
	)
}

/**
 * Internal hook to get the MapSharesStore from context.
 * Throws if used outside of MapSharesProvider.
 */
export function useMapSharesStore(): MapSharesStore {
	const store = useContext(MapSharesContext)
	if (!store) {
		throw new Error('useMapSharesStore must be used within a MapSharesProvider')
	}
	return store
}

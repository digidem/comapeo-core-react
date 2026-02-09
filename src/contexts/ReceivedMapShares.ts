import type { MapeoClientApi } from '@comapeo/ipc'
import {
	createContext,
	createElement,
	useContext,
	useMemo,
	useState,
	useSyncExternalStore,
	type Context,
	type JSX,
	type ReactNode,
} from 'react'

import {
	createReceivedMapSharesStore,
	type ReceivedMapSharesStore,
	type ReceivedMapShareState,
} from '../lib/received-map-shares-store.js'
import type { MapServerApi } from './MapServer.js'

export const ReceivedMapSharesContext: Context<ReceivedMapSharesStore | null> =
	createContext<ReceivedMapSharesStore | null>(null)

export function ReceivedMapSharesProvider({
	children,
	clientApi,
	mapServerApi,
}: {
	children: ReactNode
	clientApi: MapeoClientApi
	mapServerApi: MapServerApi
}): JSX.Element {
	const [mapSharesStore] = useState(() =>
		createReceivedMapSharesStore({
			clientApi,
			mapServerApi,
		}),
	)
	return createElement(
		ReceivedMapSharesContext.Provider,
		{ value: mapSharesStore },
		children,
	)
}

const identity = <T>(arg: T): T => arg

/**
 * Internal hook to get the MapSharesStore from context.
 * Throws if used outside of MapSharesProvider.
 */
export function useReceivedMapSharesActions() {
	const store = useContext(ReceivedMapSharesContext)
	if (!store) {
		throw new Error(
			'useReceivedMapSharesActions must be used within a ReceivedMapSharesProvider',
		)
	}
	return useMemo(() => {
		return {
			download: store.download,
			decline: store.decline,
			abort: store.abort,
		}
	}, [store.abort, store.decline, store.download])
}

export function useReceivedMapSharesState<T>(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	selector: (state: Array<ReceivedMapShareState>) => T = identity as any,
) {
	const store = useContext(ReceivedMapSharesContext)
	if (!store) {
		throw new Error(
			'useReceivedMapSharesState must be used within a ReceivedMapSharesProvider',
		)
	}
	return useSyncExternalStore(store.subscribe, () =>
		selector(store.getSnapshot()),
	)
}

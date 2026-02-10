import type { MapeoClientApi } from '@comapeo/ipc'
import {
	createContext,
	createElement,
	useContext,
	useMemo,
	useSyncExternalStore,
	type Context,
	type JSX,
	type PropsWithChildren,
} from 'react'

import {
	createSentMapSharesStore,
	type SentMapSharesStore,
	type SentMapShareState,
} from '../lib/sent-map-shares-store.js'
import type { MapServerApi } from './MapServer.js'

export const SentMapSharesContext: Context<SentMapSharesStore | null> =
	createContext<SentMapSharesStore | null>(null)

export function SentMapSharesProvider({
	children,
	clientApi,
	mapServerApi,
}: PropsWithChildren<{
	clientApi: MapeoClientApi
	mapServerApi: MapServerApi
}>): JSX.Element {
	const mapSharesStore = useMemo(
		() =>
			createSentMapSharesStore({
				clientApi,
				mapServerApi,
			}),
		[clientApi, mapServerApi],
	)

	return createElement(
		SentMapSharesContext.Provider,
		{ value: mapSharesStore },
		children,
	)
}

const identity = <T>(arg: T): T => arg

/**
 * Internal hook to get the MapSharesStore from context.
 * Throws if used outside of MapSharesProvider.
 */
export function useSentMapSharesActions() {
	const store = useContext(SentMapSharesContext)
	if (!store) {
		throw new Error(
			'useSentMapSharesActions must be used within a SentMapSharesProvider',
		)
	}
	return useMemo(() => {
		return {
			create: store.create,
			cancel: store.cancel,
		}
	}, [store.cancel, store.create])
}

export function useSentMapSharesState<T>(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	selector: (state: Array<SentMapShareState>) => T = identity as any,
) {
	const store = useContext(SentMapSharesContext)
	if (!store) {
		throw new Error(
			'useSentMapSharesState must be used within a SentMapSharesProvider',
		)
	}
	return useSyncExternalStore(store.subscribe, () =>
		selector(store.getSnapshot()),
	)
}

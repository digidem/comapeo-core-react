import type { MapeoClientApi } from '@comapeo/ipc'
import {
	createContext,
	createElement,
	useCallback,
	useContext,
	useMemo,
	useSyncExternalStore,
	type Context,
	type JSX,
	type PropsWithChildren,
} from 'react'

import {
	createReceivedMapSharesStore,
	createSentMapSharesStore,
	type ReceivedMapSharesStore,
	type ReceivedMapShareState,
	type SentMapSharesStore,
	type SentMapShareState,
} from '../lib/map-shares-stores.js'
import type { MapServerApi } from './MapServer.js'

/**
 * @internal
 */
export const ReceivedMapSharesContext: Context<ReceivedMapSharesStore | null> =
	createContext<ReceivedMapSharesStore | null>(null)

/**
 * @internal
 */
export const SentMapSharesContext: Context<SentMapSharesStore | null> =
	createContext<SentMapSharesStore | null>(null)

type MapSharesProviderProps = PropsWithChildren<{
	clientApi: MapeoClientApi
	mapServerApi: MapServerApi
}>

/**
 * @internal
 */
export function ReceivedMapSharesProvider({
	children,
	clientApi,
	mapServerApi,
}: MapSharesProviderProps): JSX.Element {
	const mapSharesStore = useMemo(
		() => createReceivedMapSharesStore({ clientApi, mapServerApi }),
		[clientApi, mapServerApi],
	)
	return createElement(
		ReceivedMapSharesContext.Provider,
		{ value: mapSharesStore },
		children,
	)
}

/**
 * @internal
 */
export function SentMapSharesProvider({
	children,
	clientApi,
	mapServerApi,
}: MapSharesProviderProps): JSX.Element {
	const mapSharesStore = useMemo(
		() => createSentMapSharesStore({ clientApi, mapServerApi }),
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
 */
function useMapSharesActions<
	TStore extends ReceivedMapSharesStore | SentMapSharesStore,
>(context: Context<TStore | null>): TStore['actions'] {
	const store = useContext(context)
	if (!store) {
		throw new Error('useMapSharesActions must be used within MapSharesProvider')
	}
	return store.actions
}

function useMapSharesState<
	TStore extends ReceivedMapSharesStore | SentMapSharesStore,
	TSelector,
>(
	context: Context<TStore | null>,
	selector: (
		state: Array<
			TStore extends ReceivedMapSharesStore
				? ReceivedMapShareState
				: SentMapShareState
		>,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	) => TSelector = identity as any,
): TSelector {
	const store = useContext(context)
	if (!store) {
		throw new Error('useMapSharesState must be used within MapSharesProvider')
	}
	return useSyncExternalStore(
		store.subscribe,
		useCallback(
			// Casting here because of TS not resolving generic conditional types correctly
			() => selector(store.getSnapshot() as Parameters<typeof selector>[0]),
			[selector, store],
		),
	)
}

/**
 * @internal
 */
export function useReceivedMapSharesActions() {
	return useMapSharesActions(ReceivedMapSharesContext)
}

/**
 * @internal
 */
export function useReceivedMapSharesState(): Array<ReceivedMapShareState>
export function useReceivedMapSharesState<T>(
	selector: (state: Array<ReceivedMapShareState>) => T,
): T
export function useReceivedMapSharesState<T>(
	selector?: (state: Array<ReceivedMapShareState>) => T,
): Array<ReceivedMapShareState> | T {
	return useMapSharesState(ReceivedMapSharesContext, selector)
}

/**
 * @internal
 */
export function useSentMapSharesActions() {
	return useMapSharesActions(SentMapSharesContext)
}

/**
 * @internal
 */
export function useSentMapSharesState<T>(
	selector?: (state: Array<SentMapShareState>) => T,
) {
	return useMapSharesState(SentMapSharesContext, selector)
}

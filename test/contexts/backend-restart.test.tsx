import type { ComapeoCoreClientApi } from '@comapeo/ipc'
import {
	QueryClient,
	QueryClientProvider,
	useQuery,
} from '@tanstack/react-query'
import { act, render, waitFor } from '@testing-library/react'
import { type ReactNode } from 'react'
import { describe, expect, test, vi } from 'vitest'

import { ComapeoCoreProvider } from '../../src/index.js'
import { createMockClientApi } from '../helpers/client-api-mock.js'

// Kept as a literal so the test fails if the shared query key prefix changes
// without the consumers of `invalidateQueries` being updated.
const ROOT_QUERY_KEY = '@comapeo/core-react'

type SubscribeToBackendRestart = (listener: () => void) => () => void

function createBackendRestartSource() {
	const listeners = new Set<() => void>()
	const unsubscribe = vi.fn()

	const subscribe: SubscribeToBackendRestart = vi.fn((listener) => {
		listeners.add(listener)
		return () => {
			listeners.delete(listener)
			unsubscribe()
		}
	})

	return {
		subscribe,
		unsubscribe,
		listenerCount: () => listeners.size,
		restart() {
			act(() => {
				for (const listener of [...listeners]) {
					listener()
				}
			})
		},
	}
}

function renderProvider({
	queryClient,
	subscribeToBackendRestart,
	children,
}: {
	queryClient: QueryClient
	subscribeToBackendRestart?: SubscribeToBackendRestart
	children?: ReactNode
}) {
	const clientApi = createMockClientApi() as unknown as ComapeoCoreClientApi

	function Tree(props: {
		subscribeToBackendRestart?: SubscribeToBackendRestart
	}) {
		return (
			<QueryClientProvider client={queryClient}>
				<ComapeoCoreProvider
					queryClient={queryClient}
					clientApi={clientApi}
					getMapServerBaseUrl={async () => new URL('http://localhost:3000')}
					subscribeToBackendRestart={props.subscribeToBackendRestart}
				>
					{children}
				</ComapeoCoreProvider>
			</QueryClientProvider>
		)
	}

	const utils = render(
		<Tree subscribeToBackendRestart={subscribeToBackendRestart} />,
	)

	return {
		...utils,
		setSubscribeToBackendRestart(next?: SubscribeToBackendRestart) {
			utils.rerender(<Tree subscribeToBackendRestart={next} />)
		},
	}
}

describe('subscribeToBackendRestart', () => {
	test('is optional', () => {
		const queryClient = new QueryClient()

		expect(() => {
			renderProvider({ queryClient })
		}).not.toThrow()
	})

	// Call counts are not asserted anywhere in this file: the test setup enables
	// `reactStrictMode`, so effects are mounted, cleaned up and re-mounted. The
	// number of live listeners is what actually matters.
	test('subscribes on mount', () => {
		const queryClient = new QueryClient()
		const backend = createBackendRestartSource()

		renderProvider({
			queryClient,
			subscribeToBackendRestart: backend.subscribe,
		})

		expect(backend.subscribe).toHaveBeenCalled()
		expect(backend.listenerCount()).toBe(1)
	})

	test('a restart invalidates cached queries owned by this package', () => {
		const queryClient = new QueryClient()
		const packageQueryKey = [ROOT_QUERY_KEY, 'projects', 'project-id']
		const appQueryKey = ['app-owned-query']

		queryClient.setQueryData(packageQueryKey, 'from the previous backend')
		queryClient.setQueryData(appQueryKey, 'not ours')

		const backend = createBackendRestartSource()

		renderProvider({
			queryClient,
			subscribeToBackendRestart: backend.subscribe,
		})

		expect(queryClient.getQueryState(packageQueryKey)?.isInvalidated).toBe(
			false,
		)

		backend.restart()

		expect(queryClient.getQueryState(packageQueryKey)?.isInvalidated).toBe(true)
		// The consuming app may share the QueryClient, so its queries are left alone
		expect(queryClient.getQueryState(appQueryKey)?.isInvalidated).toBe(false)
	})

	test('a restart refetches mounted queries owned by this package', async () => {
		const queryClient = new QueryClient()
		const queryFn = vi.fn(async () => 'project')
		const backend = createBackendRestartSource()

		function Probe() {
			useQuery({
				queryKey: [ROOT_QUERY_KEY, 'projects', 'project-id'],
				queryFn,
				networkMode: 'always',
				retry: false,
			})
			return null
		}

		renderProvider({
			queryClient,
			subscribeToBackendRestart: backend.subscribe,
			children: <Probe />,
		})

		await waitFor(() => {
			expect(queryFn).toHaveBeenCalledTimes(1)
		})

		backend.restart()

		await waitFor(() => {
			expect(queryFn).toHaveBeenCalledTimes(2)
		})
	})

	test('unsubscribes on unmount', () => {
		const queryClient = new QueryClient()
		const backend = createBackendRestartSource()

		const { unmount } = renderProvider({
			queryClient,
			subscribeToBackendRestart: backend.subscribe,
		})

		expect(backend.listenerCount()).toBe(1)

		unmount()

		expect(backend.unsubscribe).toHaveBeenCalled()
		expect(backend.listenerCount()).toBe(0)
	})

	test('unsubscribes from the previous function when the prop changes', () => {
		const queryClient = new QueryClient()
		const first = createBackendRestartSource()
		const second = createBackendRestartSource()

		const { setSubscribeToBackendRestart } = renderProvider({
			queryClient,
			subscribeToBackendRestart: first.subscribe,
		})

		setSubscribeToBackendRestart(second.subscribe)

		expect(first.unsubscribe).toHaveBeenCalled()
		expect(first.listenerCount()).toBe(0)
		expect(second.listenerCount()).toBe(1)
	})

	test('a restart no longer invalidates after unmount', () => {
		const queryClient = new QueryClient()
		const packageQueryKey = [ROOT_QUERY_KEY, 'projects', 'project-id']
		queryClient.setQueryData(packageQueryKey, 'from the previous backend')

		const backend = createBackendRestartSource()

		const { unmount } = renderProvider({
			queryClient,
			subscribeToBackendRestart: backend.subscribe,
		})

		unmount()
		backend.restart()

		expect(queryClient.getQueryState(packageQueryKey)?.isInvalidated).toBe(
			false,
		)
	})
})

import type { ComapeoCoreClientApi } from '@comapeo/ipc'
import {
	QueryClient,
	QueryClientProvider,
	useQuery,
} from '@tanstack/react-query'
import { act, render, waitFor, within } from '@testing-library/react'
import { Component, Suspense, type ReactNode } from 'react'
import { describe, expect, test, vi } from 'vitest'

import {
	ComapeoCoreProvider,
	useAttachmentUrl,
	useManyInvites,
	useOwnDeviceInfo,
	useProjectSettings,
	useSingleProject,
	type SubscribeToBackendRestart,
} from '../../src/index.js'
import { createMockClientApi } from '../helpers/client-api-mock.js'

// Kept as a literal so the test fails if the shared query key prefix changes
// without the reset in `src/lib/react-query.ts` being updated.
const ROOT_QUERY_KEY = '@comapeo/core-react'
const PROJECT_ID = 'project-id'

function createBackendRestartSource() {
	const listeners = new Set<() => void>()
	const unsubscribe = vi.fn()

	const subscribe = vi.fn<SubscribeToBackendRestart>((listener) => {
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

/**
 * A client API whose `getProject()` hands out generation-tagged project
 * instances. Bumping the generation stands in for a backend restart, and is
 * deliberately the harshest shape the reset has to cope with: every instance
 * handed out before the bump starts rejecting, as a project wrapper does under
 * `@comapeo/ipc` v9. A v10 reference stays usable instead, which only makes the
 * same reset easier — so passing here covers both.
 */
function createGenerationalClientApi() {
	let generation = 0

	const getProject = vi.fn(async (projectId: string) => {
		const instanceGeneration = generation
		function assertLive() {
			if (instanceGeneration !== generation) {
				throw new Error(
					`ProjectClosed: instance from generation ${instanceGeneration}`,
				)
			}
		}
		return {
			generation: instanceGeneration,
			projectId,
			$getProjectSettings: async () => {
				assertLive()
				return { name: `settings-gen-${instanceGeneration}` }
			},
			$blobs: {
				// The media server port is ephemeral and changes on every restart
				getUrl: async () => {
					assertLive()
					return `http://127.0.0.1:${5000 + instanceGeneration}/blob`
				},
			},
		}
	})

	const clientApi = Object.assign(createMockClientApi(), { getProject })

	return {
		clientApi: clientApi as unknown as ComapeoCoreClientApi,
		getProject,
		bumpGeneration() {
			generation += 1
		},
	}
}

function ProjectScreen() {
	const { data: projectApi } = useSingleProject({ projectId: PROJECT_ID })
	const { data: settings } = useProjectSettings({ projectId: PROJECT_ID })
	const { data: attachmentUrl } = useAttachmentUrl({
		projectId: PROJECT_ID,
		blobId: {
			type: 'photo',
			variant: 'thumbnail',
			name: 'name',
			driveId: 'drive-id',
		},
	})

	return (
		<div>
			<span data-testid="generation">
				{String((projectApi as unknown as { generation: number }).generation)}
			</span>
			<span data-testid="settings-name">{settings.name}</span>
			<span data-testid="attachment-url">{attachmentUrl}</span>
		</div>
	)
}

function renderProvider({
	queryClient,
	clientApi = createMockClientApi() as unknown as ComapeoCoreClientApi,
	subscribeToBackendRestart,
	children,
}: {
	queryClient: QueryClient
	clientApi?: ComapeoCoreClientApi
	subscribeToBackendRestart?: SubscribeToBackendRestart
	children?: ReactNode
}) {
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
					<Suspense fallback={<span data-testid="loading">loading</span>}>
						{children}
					</Suspense>
				</ComapeoCoreProvider>
			</QueryClientProvider>
		)
	}

	const utils = render(
		<Tree subscribeToBackendRestart={subscribeToBackendRestart} />,
	)

	return {
		...utils,
		screen: within(utils.container),
		rerenderTree() {
			utils.rerender(
				<Tree subscribeToBackendRestart={subscribeToBackendRestart} />,
			)
		},
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

	test('does not resubscribe when the tree re-renders with the same function', () => {
		const queryClient = new QueryClient()
		const backend = createBackendRestartSource()

		const { rerenderTree } = renderProvider({
			queryClient,
			subscribeToBackendRestart: backend.subscribe,
		})

		const subscribeCalls = backend.subscribe.mock.calls.length

		rerenderTree()
		rerenderTree()

		expect(backend.subscribe.mock.calls.length).toBe(subscribeCalls)
		expect(backend.listenerCount()).toBe(1)
	})
})

describe('recovery after a restart', () => {
	test('a mounted project-derived query ends up with data from the new backend', async () => {
		const queryClient = new QueryClient()
		const backend = createGenerationalClientApi()
		const restarts = createBackendRestartSource()

		const { screen } = renderProvider({
			queryClient,
			clientApi: backend.clientApi,
			subscribeToBackendRestart: restarts.subscribe,
			children: <ProjectScreen />,
		})

		await waitFor(() => {
			expect(screen.getByTestId('settings-name').textContent).toBe(
				'settings-gen-0',
			)
		})

		backend.bumpGeneration()
		restarts.restart()

		await waitFor(() => {
			expect(screen.queryByTestId('loading')).toBeNull()
			expect(screen.getByTestId('generation').textContent).toBe('1')
			expect(screen.getByTestId('settings-name').textContent).toBe(
				'settings-gen-1',
			)
		})

		// A `useSuspenseQuery` with `retry: false` that fails once never refetches
		// again, so the derived query must never have run against the closed
		// instance in the first place
		expect(
			queryClient.getQueryState([
				ROOT_QUERY_KEY,
				'projects',
				PROJECT_ID,
				'project_settings',
			])?.status,
		).toBe('success')
	})

	test('a static-staleTime query re-runs after a restart', async () => {
		const queryClient = new QueryClient()
		const backend = createGenerationalClientApi()
		const restarts = createBackendRestartSource()

		const { screen } = renderProvider({
			queryClient,
			clientApi: backend.clientApi,
			subscribeToBackendRestart: restarts.subscribe,
			children: <ProjectScreen />,
		})

		await waitFor(() => {
			expect(screen.getByTestId('attachment-url').textContent).toContain(
				'127.0.0.1:5000',
			)
		})

		backend.bumpGeneration()
		restarts.restart()

		// The media server origin is cached with `staleTime: 'static'`, so
		// invalidation cannot reach it: without being removed, every image URL
		// would point at the dead port for the life of the app
		await waitFor(() => {
			expect(screen.getByTestId('attachment-url').textContent).toContain(
				'127.0.0.1:5001',
			)
		})
	})

	test('manager-level queries are refetched without dropping their data', async () => {
		const queryClient = new QueryClient()
		const restarts = createBackendRestartSource()
		const queryFn = vi.fn(async () => 'device-info')

		function ManagerLevelProbe() {
			const { data } = useQuery({
				queryKey: [ROOT_QUERY_KEY, 'client', 'device_info'],
				queryFn,
				networkMode: 'always',
				retry: false,
			})
			return <span data-testid="device-info">{data ?? 'none'}</span>
		}

		const { screen } = renderProvider({
			queryClient,
			subscribeToBackendRestart: restarts.subscribe,
			children: <ManagerLevelProbe />,
		})

		await waitFor(() => {
			expect(queryFn).toHaveBeenCalledTimes(1)
		})

		restarts.restart()

		await waitFor(() => {
			expect(queryFn).toHaveBeenCalledTimes(2)
		})
		// Invalidated, not removed: the data stays put while it refetches
		expect(screen.getByTestId('device-info').textContent).toBe('device-info')
	})

	// Invites are in-memory actors on the backend: a restart drops every one of
	// them, and `invite.getMany()` is the only way to find out what the new
	// backend has. Nothing invalidates the invites query on its own - the
	// `invite-received` / `invite-updated` events that normally do were raised
	// (if at all) while the app was disconnected - so the root invalidation is
	// what has to reach it.
	test('the invites query is refetched', async () => {
		const queryClient = new QueryClient()
		const restarts = createBackendRestartSource()
		const clientApi = createMockClientApi()
		const getMany = vi.fn(async () => [])
		Object.assign(clientApi.invite, { getMany })

		function InvitesProbe() {
			const { data } = useManyInvites()
			return <span data-testid="invite-count">{data.length}</span>
		}

		const { screen } = renderProvider({
			queryClient,
			clientApi: clientApi as unknown as ComapeoCoreClientApi,
			subscribeToBackendRestart: restarts.subscribe,
			children: <InvitesProbe />,
		})

		await waitFor(() => {
			expect(screen.getByTestId('invite-count').textContent).toBe('0')
		})
		const callsBeforeRestart = getMany.mock.calls.length

		restarts.restart()

		await waitFor(() => {
			expect(getMany.mock.calls.length).toBeGreaterThan(callsBeforeRestart)
		})
	})

	test('queries owned by the consuming app are left alone', () => {
		const queryClient = new QueryClient()
		const appQueryKey = ['app-owned-query']
		queryClient.setQueryData(appQueryKey, 'not ours')

		const restarts = createBackendRestartSource()

		renderProvider({
			queryClient,
			subscribeToBackendRestart: restarts.subscribe,
		})

		restarts.restart()

		expect(queryClient.getQueryData(appQueryKey)).toBe('not ours')
		expect(queryClient.getQueryState(appQueryKey)?.isInvalidated).toBe(false)
	})

	test('a restart no longer resets the cache after unmount', () => {
		const queryClient = new QueryClient()
		const projectQueryKey = [ROOT_QUERY_KEY, 'projects', PROJECT_ID]
		queryClient.setQueryData(projectQueryKey, 'from the previous backend')

		const restarts = createBackendRestartSource()

		const { unmount } = renderProvider({
			queryClient,
			subscribeToBackendRestart: restarts.subscribe,
		})

		unmount()
		restarts.restart()

		expect(queryClient.getQueryData(projectQueryKey)).toBe(
			'from the previous backend',
		)
	})
})

class TestErrorBoundary extends Component<
	{ children: ReactNode },
	{ error: Error | null }
> {
	override state: { error: Error | null } = { error: null }
	static getDerivedStateFromError(error: Error) {
		return { error }
	}
	override render() {
		if (this.state.error) {
			return (
				<span
					data-testid="boundary-error"
					data-code={String(
						(this.state.error as Error & { code?: unknown }).code,
					)}
				>
					{this.state.error.message}
				</span>
			)
		}
		return this.props.children
	}
}

function DeviceInfoScreen() {
	const { data } = useOwnDeviceInfo()
	return (
		<span data-testid="device-name">
			{(data as unknown as { name: string }).name}
		</span>
	)
}

describe('channel-closed retry', () => {
	// A query in flight when the backend's RPC transport drops rejects with
	// code RPC_CHANNEL_CLOSED (a read whose response will never arrive).
	// `baseQueryOptions` retries only that code, so the query keeps loading
	// through the restart instead of latching into an error state.
	test('a channel-closed rejection is retried and resolves', async () => {
		const queryClient = new QueryClient()
		const clientApi =
			createMockClientApi() as unknown as ComapeoCoreClientApi & {
				getDeviceInfo: ReturnType<typeof vi.fn>
			}
		let failuresLeft = 1
		clientApi.getDeviceInfo = vi.fn(async () => {
			if (failuresLeft > 0) {
				failuresLeft -= 1
				throw Object.assign(new Error('Channel closed'), {
					code: 'RPC_CHANNEL_CLOSED',
				})
			}
			return {
				deviceId: 'device-id',
				name: 'gecko',
				deviceType: 'mobile' as const,
			}
		})

		const { screen } = renderProvider({
			queryClient,
			clientApi,
			children: (
				<TestErrorBoundary>
					<DeviceInfoScreen />
				</TestErrorBoundary>
			),
		})

		await waitFor(
			() => {
				expect(screen.getByTestId('device-name').textContent).toBe('gecko')
			},
			{ timeout: 5_000 },
		)
		expect(screen.queryByTestId('boundary-error')).toBeNull()
		expect(clientApi.getDeviceInfo.mock.calls.length).toBeGreaterThanOrEqual(2)
	}, 10_000)

	test('other errors are not retried', async () => {
		const queryClient = new QueryClient()
		const clientApi =
			createMockClientApi() as unknown as ComapeoCoreClientApi & {
				getDeviceInfo: ReturnType<typeof vi.fn>
			}
		clientApi.getDeviceInfo = vi.fn(async () => {
			throw new Error('genuinely broken')
		})

		const { screen } = renderProvider({
			queryClient,
			clientApi,
			children: (
				<TestErrorBoundary>
					<DeviceInfoScreen />
				</TestErrorBoundary>
			),
		})

		await waitFor(() => {
			expect(screen.getByTestId('boundary-error').textContent).toBe(
				'genuinely broken',
			)
		})
	})
})

// @comapeo/ipc v10 hands out permanent project references. Leaving a project
// does not invalidate the reference the app is holding: every call on it -
// and `getProject()` itself, for a project left before it was ever acquired -
// rejects with `ProjectLeftError` until the project is re-joined via an
// invite. There is nothing to recover from, so the error has to reach the
// consuming app's error boundary with its code intact and without being
// retried first.
describe('a project this device has left', () => {
	function createLeftProjectError() {
		return Object.assign(new Error('This device has left the project'), {
			code: 'PROJECT_LEFT',
		})
	}

	function createLeftProjectClientApi({ leftBefore }: { leftBefore: boolean }) {
		const getProject = vi.fn(async () => {
			if (leftBefore) throw createLeftProjectError()
			return {
				$getProjectSettings: async () => {
					throw createLeftProjectError()
				},
			}
		})
		const clientApi = Object.assign(createMockClientApi(), { getProject })
		return {
			clientApi: clientApi as unknown as ComapeoCoreClientApi,
			getProject,
		}
	}

	function LeftProjectScreen() {
		const { data } = useProjectSettings({ projectId: PROJECT_ID })
		return <span data-testid="settings-name">{data.name}</span>
	}

	test('a call on a held reference reaches the error boundary', async () => {
		const { clientApi } = createLeftProjectClientApi({ leftBefore: false })

		const { screen } = renderProvider({
			queryClient: new QueryClient(),
			clientApi,
			children: (
				<TestErrorBoundary>
					<LeftProjectScreen />
				</TestErrorBoundary>
			),
		})

		await waitFor(() => {
			expect(screen.getByTestId('boundary-error').textContent).toBe(
				'This device has left the project',
			)
		})
		expect(screen.getByTestId('boundary-error').dataset.code).toBe(
			'PROJECT_LEFT',
		)
	})

	test('a first acquisition reaches the error boundary', async () => {
		const { clientApi, getProject } = createLeftProjectClientApi({
			leftBefore: true,
		})

		const { screen } = renderProvider({
			queryClient: new QueryClient(),
			clientApi,
			children: (
				<TestErrorBoundary>
					<LeftProjectScreen />
				</TestErrorBoundary>
			),
		})

		await waitFor(() => {
			expect(screen.getByTestId('boundary-error').dataset.code).toBe(
				'PROJECT_LEFT',
			)
		})
		// Not retried: a retry would push the failure past the 1s retry delay
		const callsWhenSettled = getProject.mock.calls.length
		await new Promise((resolve) => setTimeout(resolve, 1_200))
		expect(getProject.mock.calls.length).toBe(callsWhenSettled)
	}, 10_000)
})

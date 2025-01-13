import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { assert, describe, test } from 'vitest'

import {
	useClientApi,
	useIsArchiveDevice,
	useOwnDeviceInfo,
	useSetIsArchiveDevice,
	useSetOwnDeviceInfo,
} from '../../src/index.js'
import { setupCoreIpc } from '../helpers/ipc.js'
import { createClientApiWrapper } from '../helpers/react.js'

describe('useClientApi()', () => {
	test('throws when ClientApiProvider is not set up', () => {
		const queryClient = new QueryClient()

		assert.throws(() => {
			renderHook(() => useClientApi(), {
				wrapper: ({ children }) => {
					return (
						<QueryClientProvider client={queryClient}>
							{children}
						</QueryClientProvider>
					)
				},
			})
		}, 'No client API set')
	})

	test('returns client api instance when ClientApiProvider is set up properly', (t) => {
		const { client, cleanup } = setupCoreIpc()

		t.onTestFinished(() => {
			return cleanup()
		})

		const { result } = renderHook(() => useClientApi(), {
			wrapper: createClientApiWrapper({ clientApi: client }),
		})

		assert.isDefined(result.current, 'client is set up properly')
	})
})

describe('device info', () => {
	test('basic read and write', async (t) => {
		const { client, cleanup } = setupCoreIpc()

		t.onTestFinished(() => {
			return cleanup()
		})

		const queryClient = new QueryClient()

		const wrapper = createClientApiWrapper({ clientApi: client, queryClient })

		const readHook = renderHook(() => useOwnDeviceInfo(), { wrapper })
		const writeHook = renderHook(() => useSetOwnDeviceInfo(), { wrapper })

		// Since the read hook is Suspense-based, we need to simulate waiting for the data to initially resolve
		await waitFor(() => {
			assert.isNotNull(readHook.result.current.data)
		})

		const expectedDeviceId = await client.deviceId()

		// 1. Initial state
		assert.deepStrictEqual(
			readHook.result.current,
			{
				data: {
					deviceId: expectedDeviceId,
					deviceType: 'device_type_unspecified',
				},
				isRefetching: false,
				error: null,
			},
			'read hook has expected initial state',
		)
		assert.deepStrictEqual(
			writeHook.result.current.status,
			'idle',
			'write hook has expected initial status',
		)

		// 2. Simulate a user interaction
		act(() => {
			writeHook.result.current.mutate({
				name: 'my device',
				deviceType: 'tablet',
			})
		})

		// 3. Write hook lifecycle
		// TODO: Ideally check for status === 'pending' before this
		await waitFor(() => {
			assert.strictEqual(writeHook.result.current.status, 'success')
		})

		// 4. Read hook lifecycle
		// TODO: Ideally check for isRefetching === true before this
		await waitFor(() => {
			assert.strictEqual(readHook.result.current.isRefetching, false)
		})

		assert.deepStrictEqual(
			readHook.result.current,
			{
				isRefetching: false,
				error: null,
				data: {
					deviceId: expectedDeviceId,
					name: 'my device',
					deviceType: 'tablet',
				},
			},
			'read hook has expected updated state',
		)
	})
})

describe('is archive device', () => {
	test('basic read and write', async (t) => {
		const { client, cleanup } = setupCoreIpc()

		t.onTestFinished(() => {
			return cleanup()
		})

		const queryClient = new QueryClient()

		const wrapper = createClientApiWrapper({ clientApi: client, queryClient })

		const readHook = renderHook(() => useIsArchiveDevice(), { wrapper })
		const writeHook = renderHook(() => useSetIsArchiveDevice(), { wrapper })

		// Since the hook is Suspense-based, we need to simulate waiting for the data to initially resolve
		await waitFor(() => {
			assert.isNotNull(readHook.result.current.data)
		})

		// 1. Initial state
		assert.deepStrictEqual(
			readHook.result.current,
			{
				data: true,
				error: null,
				isRefetching: false,
			},
			'read hook has expected initial state',
		)
		assert.deepStrictEqual(
			writeHook.result.current.status,
			'idle',
			'write hook has expected initial status',
		)

		// 2. Simulate a user interaction
		act(() => {
			writeHook.result.current.mutate({ isArchiveDevice: false })
		})

		// 3. Write hook lifecycle
		// TODO: Ideally check for status === 'pending' before this
		await waitFor(() => {
			assert.strictEqual(writeHook.result.current.status, 'success')
		})

		// 4. Read hook lifecycle
		// TODO: Ideally check for isRefetching === true before this
		await waitFor(() => {
			assert.strictEqual(readHook.result.current.isRefetching, false)
		})

		assert.strictEqual(readHook.result.current.data, false, 'data has updated')
	})
})

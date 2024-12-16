import { MapeoClientApi } from '@comapeo/ipc'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { assert, assertType, test } from 'vitest'

import {
	getDeviceInfoQueryKey,
	getIsArchiveDeviceQueryKey,
	useClientApi,
	useIsArchiveDevice,
	useOwnDeviceInfo,
} from '../../src/index.js'
import { setupCoreIpc } from '../helpers/ipc.js'
import { createClientApiWrapper } from '../helpers/react.js'

test('useClientApi() throws when ClientApiProvider is not set up', () => {
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

test('useClientApi() returns client api instance when ClientApiProvider is set up properly', (t) => {
	const { client, cleanup } = setupCoreIpc()

	t.onTestFinished(() => {
		return cleanup()
	})

	const { result } = renderHook(() => useClientApi(), {
		wrapper: createClientApiWrapper({ clientApi: client }),
	})

	assertType<MapeoClientApi>(result.current)

	assert.isDefined(result.current, 'client is set up properly')
})

test('useOwnDeviceInfo()', async (t) => {
	const { client, cleanup } = setupCoreIpc()

	t.onTestFinished(() => {
		return cleanup()
	})

	const queryClient = new QueryClient()

	const { result, rerender } = renderHook(() => useOwnDeviceInfo(), {
		wrapper: createClientApiWrapper({ clientApi: client, queryClient }),
	})

	await waitFor(() => {
		return result.current.data !== null
	})

	assert.isString(result.current.data.deviceId)
	assert.strictEqual(result.current.data.deviceType, 'device_type_unspecified')
	assert.isUndefined(result.current.data.name)
	assert.isUndefined(result.current.data.selfHostedServerDetails)

	const expected = {
		name: 'foo',
		deviceType: 'desktop' as const,
	}

	// TODO: Replace with a mutation-based implementation
	await client.setDeviceInfo(expected)
	queryClient.invalidateQueries({ queryKey: getDeviceInfoQueryKey() })

	rerender()

	assert.strictEqual(result.current.isRefetching, true)

	await waitFor(() => {
		return result.current.isRefetching === false
	})

	rerender()

	assert.strictEqual(result.current.isRefetching, false)

	assert.strictEqual(result.current.data.name, expected.name)
	assert.strictEqual(result.current.data.deviceType, expected.deviceType)
})

test('useIsArchiveDevice()', async (t) => {
	const { client, cleanup } = setupCoreIpc()

	t.onTestFinished(() => {
		return cleanup()
	})

	const queryClient = new QueryClient()

	const { result, rerender } = renderHook(() => useIsArchiveDevice(), {
		wrapper: createClientApiWrapper({ clientApi: client, queryClient }),
	})

	await waitFor(() => {
		return result.current.data !== null
	})

	assert.strictEqual(result.current.data, true)

	// TODO: Replace with a mutation-based implementation
	await client.setIsArchiveDevice(false)
	queryClient.invalidateQueries({ queryKey: getIsArchiveDeviceQueryKey() })

	rerender()

	assert.deepEqual(result.current.isRefetching, true)

	await waitFor(() => {
		return result.current.isRefetching === false
	})

	rerender()

	assert.strictEqual(result.current.isRefetching, false)

	assert.strictEqual(result.current.data, false)
})

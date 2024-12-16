import { MapeoClientApi } from '@comapeo/ipc'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { assert, assertType, describe, test } from 'vitest'

import {
	getDeviceInfoQueryKey,
	getIsArchiveDeviceQueryKey,
	useClientApi,
	useIsArchiveDevice,
	useOwnDeviceInfo,
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

		assertType<MapeoClientApi>(result.current)

		assert.isDefined(result.current, 'client is set up properly')
	})
})

describe('useDeviceInfo()', () => {
	test('works with basic write then read flow', async (t) => {
		const { client, cleanup } = setupCoreIpc()

		t.onTestFinished(() => {
			return cleanup()
		})

		const queryClient = new QueryClient()

		const { result, rerender } = renderHook(() => useOwnDeviceInfo(), {
			wrapper: createClientApiWrapper({ clientApi: client, queryClient }),
		})

		// Since the hook is Suspense-based, we need to simulate waiting for the data to initially resolve
		await waitFor(() => {
			return result.current.data !== null
		})

		const expectedDeviceId = await client.deviceId()

		assert.deepStrictEqual(
			result.current.data,
			{
				deviceId: expectedDeviceId,
				deviceType: 'device_type_unspecified',
			},
			'has expected initial data',
		)

		// Basic write then read
		{
			// TODO: Replace with a mutation-based implementation
			await client
				.setDeviceInfo({
					name: 'my device',
					deviceType: 'tablet',
				})
				.then(() => {
					// We explicitly do not return the promise here because we want to
					// check that the `isRefetching` field updates properly
					queryClient.invalidateQueries({ queryKey: getDeviceInfoQueryKey() })
				})

			rerender()

			assert.strictEqual(
				result.current.isRefetching,
				true,
				'write operation starting causes isRefetching to be true',
			)

			await waitFor(() => {
				return result.current.isRefetching === false
			})

			rerender()

			assert.strictEqual(
				result.current.isRefetching,
				false,
				'write operation finishing causes isRefetching to be false',
			)

			assert.deepStrictEqual(
				result.current.data,
				{
					deviceId: expectedDeviceId,
					name: 'my device',
					deviceType: 'tablet',
				},
				'data has updated',
			)
		}

		// Self-hosted server write then read
		{
			// TODO: Replace with a mutation-based implementation
			await client
				.setDeviceInfo({
					name: 'my server',
					deviceType: 'selfHostedServer',
					selfHostedServerDetails: {
						baseUrl: 'https://comapeo-test.example',
					},
				})
				.then(() => {
					// We explicitly do not return the promise here because we want to
					// check that the `isRefetching` field updates properly
					queryClient.invalidateQueries({ queryKey: getDeviceInfoQueryKey() })
				})

			rerender()

			assert.strictEqual(
				result.current.isRefetching,
				true,
				'write operation starting causes isRefetching to be true',
			)

			await waitFor(() => {
				return result.current.isRefetching === false
			})

			rerender()

			assert.strictEqual(
				result.current.isRefetching,
				false,
				'write operation finishing causes isRefetching to be false',
			)

			assert.deepStrictEqual(
				result.current.data,
				{
					deviceId: expectedDeviceId,
					name: 'my server',
					deviceType: 'selfHostedServer',
					selfHostedServerDetails: {
						baseUrl: 'https://comapeo-test.example',
					},
				},
				'data has updated',
			)
		}
	})
})

describe('useIsArchiveDevice()', () => {
	test('works with basic write then read flow', async (t) => {
		const { client, cleanup } = setupCoreIpc()

		t.onTestFinished(() => {
			return cleanup()
		})

		const queryClient = new QueryClient()

		const { result, rerender } = renderHook(() => useIsArchiveDevice(), {
			wrapper: createClientApiWrapper({ clientApi: client, queryClient }),
		})

		// Since the hook is Suspense-based, we need to simulate waiting for the data to initially resolve
		await waitFor(() => {
			return result.current.data !== null
		})

		assert.strictEqual(result.current.data, true, 'has expected initial data')

		// TODO: Replace with a mutation-based implementation
		await client.setIsArchiveDevice(false).then(() => {
			// We explicitly do not return the promise here because we want to
			// check that the `isRefetching` field updates properly
			queryClient.invalidateQueries({ queryKey: getIsArchiveDeviceQueryKey() })
		})

		rerender()

		assert.strictEqual(
			result.current.isRefetching,
			true,
			'write operation starting causes isRefetching to be true',
		)

		await waitFor(() => {
			return result.current.isRefetching === false
		})

		rerender()

		assert.strictEqual(
			result.current.isRefetching,
			false,
			'write operation finishing causes isRefetching to be false',
		)

		assert.strictEqual(result.current.data, false, 'data has updated')
	})
})

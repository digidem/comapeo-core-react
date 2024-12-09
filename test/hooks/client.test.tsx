import { MapeoClientApi } from '@comapeo/ipc'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import { assert, assertType, test } from 'vitest'

import { useClientApi } from '../../src/hooks/client'
import { setupCoreIpc } from '../helpers/ipc'
import { createClientApiWrapper } from '../helpers/react'

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

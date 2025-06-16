import { QueryClient } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { afterAll, assert, beforeAll, test, vi } from 'vitest'

import { useMapStyleUrl } from '../../src/index.js'
import { setupCoreIpc } from '../helpers/ipc.js'
import { createClientApiWrapper } from '../helpers/react.js'

beforeAll(() => {
	vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterAll(() => {
	vi.useRealTimers()
})

test('basic read works', async (t) => {
	const { client, cleanup, fastifyController } = setupCoreIpc()

	fastifyController.start()

	t.onTestFinished(() => {
		return cleanup()
	})

	const queryClient = new QueryClient()

	const wrapper = createClientApiWrapper({ clientApi: client, queryClient })

	const mapStyleUrlHook = renderHook<
		ReturnType<typeof useMapStyleUrl>,
		Parameters<typeof useMapStyleUrl>[0]
	>(({ refreshToken } = {}) => useMapStyleUrl({ refreshToken }), {
		wrapper,
	})

	await act(() => vi.advanceTimersByTimeAsync(10))

	const url1 = new URL(mapStyleUrlHook.result.current.data)

	assert(url1, 'map style url hook returns valid URL')

	mapStyleUrlHook.rerender({ refreshToken: 'abc_123' })

	await act(() => vi.advanceTimersByTimeAsync(10))

	const url2 = new URL(mapStyleUrlHook.result.current.data)

	assert.notStrictEqual(
		url2.href,
		url1.href,
		'map style url hook updates after changing refresh token option',
	)

	assert.strictEqual(
		url2.searchParams.get('refresh_token'),
		'abc_123',
		'map style url has search param containing refresh token',
	)
})

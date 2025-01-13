import { QueryClient } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { assert, test } from 'vitest'

import { useMapStyleUrl } from '../../src/index.js'
import { setupCoreIpc } from '../helpers/ipc.js'
import { createClientApiWrapper } from '../helpers/react.js'

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

	await waitFor(() => {
		assert(mapStyleUrlHook.result.current.data !== null)
	})

	const url1 = new URL(mapStyleUrlHook.result.current.data)

	assert(url1, 'map style url hook returns valid URL')

	mapStyleUrlHook.rerender({ refreshToken: 'abc_123' })

	// TODO: Ideally check for isRefetching === true before this
	await waitFor(() => {
		assert(mapStyleUrlHook.result.current.isRefetching === false)
	})

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

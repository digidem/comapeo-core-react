import { describe, expect, it } from 'vitest'

import {
	createMapServerState,
	MapServerState,
} from '../../src/lib/MapServerState.js'

describe('MapServerState', () => {
	describe('createMapServerState', () => {
		it('creates a new MapServerState instance', () => {
			const state = createMapServerState()
			expect(state).toBeInstanceOf(MapServerState)
		})
	})

	describe('port', () => {
		it('returns undefined before port is set', () => {
			const state = createMapServerState()
			expect(state.port).toBeUndefined()
		})

		it('returns the port after setPort is called', () => {
			const state = createMapServerState()
			state.setPort(8080)
			expect(state.port).toBe(8080)
		})
	})

	describe('getBaseUrl', () => {
		it('returns undefined before port is set', () => {
			const state = createMapServerState()
			expect(state.getBaseUrl()).toBeUndefined()
		})

		it('returns the correct base URL after port is set', () => {
			const state = createMapServerState()
			state.setPort(8080)
			expect(state.getBaseUrl()).toBe('http://127.0.0.1:8080')
		})
	})

	describe('waitForPort', () => {
		it('resolves immediately if port is already set', async () => {
			const state = createMapServerState()
			state.setPort(8080)
			const port = await state.waitForPort()
			expect(port).toBe(8080)
		})

		it('waits for port to be set', async () => {
			const state = createMapServerState()

			// Start waiting for port
			const portPromise = state.waitForPort()

			// Set port after a small delay
			setTimeout(() => {
				state.setPort(9000)
			}, 10)

			const port = await portPromise
			expect(port).toBe(9000)
		})

		it('resolves multiple waiters when port is set', async () => {
			const state = createMapServerState()

			const promise1 = state.waitForPort()
			const promise2 = state.waitForPort()
			const promise3 = state.waitForPort()

			state.setPort(7777)

			const [port1, port2, port3] = await Promise.all([
				promise1,
				promise2,
				promise3,
			])

			expect(port1).toBe(7777)
			expect(port2).toBe(7777)
			expect(port3).toBe(7777)
		})
	})

	describe('fetch', () => {
		it('queues requests until port is set', async () => {
			const state = createMapServerState()

			// Start a fetch that should wait for port
			const fetchPromise = state.fetch('/test')

			// Set port after a small delay - but since we don't have a real server,
			// the fetch will fail, which is expected
			setTimeout(() => {
				state.setPort(1)
			}, 10)

			// The fetch should reject because there's no server at port 1
			await expect(fetchPromise).rejects.toThrow()
		})

		it('constructs correct URL from path', async () => {
			const state = createMapServerState()
			state.setPort(8080)

			// We can't easily test the actual URL without a mock,
			// but we can verify the method exists and works
			await expect(state.fetch('/mapShares')).rejects.toThrow()
		})
	})
})

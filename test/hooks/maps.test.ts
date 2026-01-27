import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'

import { MapServerProvider } from '../../src/contexts/MapServer.js'
import {
	createMapServerState,
	MapServerState,
} from '../../src/lib/MapServerState.js'

describe('Map Share Hooks - Unit Tests', () => {
	describe('MapServerState', () => {
		it('should create MapServerState with createMapServerState', () => {
			const state = createMapServerState()
			expect(state).toBeInstanceOf(MapServerState)
			expect(state.port).toBeUndefined()
		})

		it('should set and get port', () => {
			const state = createMapServerState()
			state.setPort(8080)
			expect(state.port).toBe(8080)
			expect(state.getBaseUrl()).toBe('http://127.0.0.1:8080')
		})

		it('should wait for port to be set', async () => {
			const state = createMapServerState()

			const portPromise = state.waitForPort()

			// Set port after starting to wait
			setTimeout(() => state.setPort(9000), 10)

			const port = await portPromise
			expect(port).toBe(9000)
		})
	})

	describe('MapServerProvider', () => {
		it('should render without errors', () => {
			const mapServerState = createMapServerState()
			mapServerState.setPort(8080)

			const queryClient = new QueryClient({
				defaultOptions: {
					queries: { retry: false },
				},
			})

			const wrapper = ({ children }: { children: ReactNode }) =>
				createElement(
					QueryClientProvider,
					{ client: queryClient },
					createElement(MapServerProvider, { mapServerState, children }),
				)

			const { result } = renderHook(() => mapServerState.port, { wrapper })

			expect(result.current).toBe(8080)
		})
	})
})

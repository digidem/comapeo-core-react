/**
 * @vitest-environment node
 *
 * We use node environment because:
 * - happy-dom provides its own fetch with CORS restrictions that break real HTTP requests
 * - Node environment uses native fetch which works with real servers
 * - renderHook from @testing-library/react can work in node with global-jsdom
 */
// Set up minimal DOM globals needed for React rendering in this test file
import '../helpers/jsdom-setup.js'

import fs from 'node:fs'
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import {
	useGetCustomMapInfo,
	useImportCustomMapFile,
	useMapStyleUrl,
	useRemoveCustomMapFile,
} from '../../src/index.js'
import { DEMOTILES_Z2, OSM_BRIGHT_Z6 } from '../helpers/constants.js'
import { startMapServer } from '../helpers/map-server.js'
import { createWrapper } from '../helpers/react.js'

// ============================================
// HELPERS
// ============================================

function readFixtureAsFile(fixturePath: string, filename: string): File {
	const buffer = fs.readFileSync(fixturePath)
	return new File([buffer], filename, {
		type: 'application/octet-stream',
	})
}

// ============================================
// TESTS
// ============================================

describe('Map Hooks', () => {
	describe('useMapStyleUrl', () => {
		it('returns a valid style URL', async (t) => {
			const server = await startMapServer(t, { customMapPath: OSM_BRIGHT_Z6 })
			const Wrapper = createWrapper({
				getMapServerBaseUrl: async () => new URL(server.localBaseUrl),
			})

			const { result } = renderHook(() => useMapStyleUrl(), {
				wrapper: Wrapper,
			})

			await waitFor(() => {
				expect(result.current.data).toBeDefined()
			})

			const url = new URL(result.current.data)
			expect(url.pathname).toBe('/maps/default/style.json')
			expect(url.searchParams.has('refresh_token')).toBe(true)
		})

		it('re-mounting returns the same cached URL', async (t) => {
			const server = await startMapServer(t, { customMapPath: OSM_BRIGHT_Z6 })
			const Wrapper = createWrapper({
				getMapServerBaseUrl: async () => new URL(server.localBaseUrl),
			})

			const first = renderHook(() => useMapStyleUrl(), {
				wrapper: Wrapper,
			})

			await waitFor(() => {
				expect(first.result.current.data).toBeDefined()
			})

			const firstUrl = first.result.current.data

			// This test would always pass regardless of our cache settings because
			// react query garbage collection runs after a 1000ms delay in tests. With
			// this test we actually want to test that our cache settings are caching
			// the style URL returned, so that without any map change, it is always
			// returning the same value (e.g. same refresh_token). Advancing the fake
			// timers allows us to test re-render after 5000ms without needing to wait
			// for that time in the tests. You can validate this works by testing that
			// this test fails if you set gcTime and staleTime to `0` in the hook
			// query options.
			vi.useFakeTimers()
			first.unmount()
			await vi.advanceTimersByTimeAsync(5000)
			vi.useRealTimers()

			const second = renderHook(() => useMapStyleUrl(), {
				wrapper: Wrapper,
			})

			await waitFor(() => {
				expect(second.result.current.data).toBeDefined()
			})

			expect(second.result.current.data).toBe(firstUrl)
		})
	})

	describe('useImportCustomMapFile', () => {
		it('importing a map updates the style URL', async (t) => {
			const server = await startMapServer(t, { customMapPath: OSM_BRIGHT_Z6 })
			const Wrapper = createWrapper({
				getMapServerBaseUrl: async () => new URL(server.localBaseUrl),
			})

			const { result } = renderHook(
				() => ({
					styleUrl: useMapStyleUrl(),
					importMap: useImportCustomMapFile(),
				}),
				{ wrapper: Wrapper },
			)

			await waitFor(() => {
				expect(result.current.styleUrl.data).toBeDefined()
			})

			const urlBefore = result.current.styleUrl.data

			const file = readFixtureAsFile(DEMOTILES_Z2, 'demotiles-z2.smp')

			await act(async () => {
				await result.current.importMap.mutateAsync({ file })
			})

			await waitFor(() =>
				expect(result.current.styleUrl.data).not.toBe(urlBefore),
			)

			expect(result.current.styleUrl.data).not.toBe(urlBefore)
		})

		it('style json content changes after map import', async (t) => {
			const server = await startMapServer(t, { customMapPath: OSM_BRIGHT_Z6 })
			const Wrapper = createWrapper({
				getMapServerBaseUrl: async () => new URL(server.localBaseUrl),
			})

			const { result } = renderHook(
				() => ({
					styleUrl: useMapStyleUrl(),
					importMap: useImportCustomMapFile(),
				}),
				{ wrapper: Wrapper },
			)

			await waitFor(() => {
				expect(result.current.styleUrl.data).toBeDefined()
			})

			const responseBefore = await fetch(result.current.styleUrl.data)
			const styleBefore = (await responseBefore.json()) as { name: string }

			const file = readFixtureAsFile(DEMOTILES_Z2, 'demotiles-z2.smp')

			await act(async () => {
				await result.current.importMap.mutateAsync({ file })
			})

			const responseAfter = await fetch(result.current.styleUrl.data)
			const styleAfter = (await responseAfter.json()) as { name: string }

			expect(styleAfter.name).not.toBe(styleBefore.name)
		})
	})

	describe('useRemoveCustomMapFile', () => {
		it('removing a map updates the style URL', async (t) => {
			const server = await startMapServer(t, { customMapPath: OSM_BRIGHT_Z6 })
			const Wrapper = createWrapper({
				getMapServerBaseUrl: async () => new URL(server.localBaseUrl),
			})

			const { result } = renderHook(
				() => ({
					styleUrl: useMapStyleUrl(),
					removeMap: useRemoveCustomMapFile(),
				}),
				{ wrapper: Wrapper },
			)

			await waitFor(() => {
				expect(result.current.styleUrl.data).toBeDefined()
			})

			const urlBefore = result.current.styleUrl.data

			await act(async () => {
				await result.current.removeMap.mutateAsync()
			})

			await waitFor(() =>
				expect(result.current.styleUrl.data).not.toBe(urlBefore),
			)

			expect(result.current.styleUrl.data).not.toBe(urlBefore)
		})
	})

	describe('useGetCustomMapInfo', () => {
		it('returns map info for the custom map', async (t) => {
			const server = await startMapServer(t, { customMapPath: OSM_BRIGHT_Z6 })
			const expectedSize = fs.statSync(OSM_BRIGHT_Z6).size
			const Wrapper = createWrapper({
				getMapServerBaseUrl: async () => new URL(server.localBaseUrl),
			})

			const { result } = renderHook(() => useGetCustomMapInfo(), {
				wrapper: Wrapper,
			})

			await waitFor(() => {
				expect(result.current.data).toBeDefined()
			})
			expect(result.current.data).toHaveProperty('name')
			expect(result.current.data).toHaveProperty('size', expectedSize)
			expect(result.current.data).toHaveProperty('created')
			expect(typeof result.current.data?.created).toBe('number')
		})

		it('returns a 404 HTTPError when no custom map exists', async (t) => {
			const server = await startMapServer(t)
			const Wrapper = createWrapper({
				getMapServerBaseUrl: async () => new URL(server.localBaseUrl),
			})

			const { result } = renderHook(() => useGetCustomMapInfo(), {
				wrapper: Wrapper,
			})

			await waitFor(() => {
				expect(result.current.error).not.toBeNull()
			})

			expect(result.current.error).toHaveProperty('status', 404)
			expect(result.current.error).toHaveProperty('code', 'MAP_NOT_FOUND')
		})

		it('returns a 404 HTTPError after the custom map is removed', async (t) => {
			const server = await startMapServer(t, { customMapPath: OSM_BRIGHT_Z6 })
			const Wrapper = createWrapper({
				getMapServerBaseUrl: async () => new URL(server.localBaseUrl),
			})

			const { result } = renderHook(
				() => ({
					mapInfo: useGetCustomMapInfo(),
					removeMap: useRemoveCustomMapFile(),
				}),
				{ wrapper: Wrapper },
			)

			await waitFor(() => {
				expect(result.current.mapInfo.data).toBeDefined()
			})

			await act(async () => {
				await result.current.removeMap.mutateAsync()
			})

			await waitFor(() => {
				expect(result.current.mapInfo.error).not.toBeNull()
			})

			expect(result.current.mapInfo.error).toHaveProperty('status', 404)
			expect(result.current.mapInfo.error).toHaveProperty(
				'code',
				'MAP_NOT_FOUND',
			)
		})

		it('map info updates after importing a new custom map', async (t) => {
			const server = await startMapServer(t, { customMapPath: OSM_BRIGHT_Z6 })
			const Wrapper = createWrapper({
				getMapServerBaseUrl: async () => new URL(server.localBaseUrl),
			})

			const { result } = renderHook(
				() => ({
					mapInfo: useGetCustomMapInfo(),
					importMap: useImportCustomMapFile(),
				}),
				{ wrapper: Wrapper },
			)

			await waitFor(() => {
				expect(result.current.mapInfo.data).toBeDefined()
			})

			const infoBefore = result.current.mapInfo.data

			const file = readFixtureAsFile(DEMOTILES_Z2, 'demotiles-z2.smp')

			await act(async () => {
				await result.current.importMap.mutateAsync({ file })
			})

			await waitFor(() =>
				expect(result.current.mapInfo.data).not.toEqual(infoBefore),
			)

			expect(result.current.mapInfo.data).not.toEqual(infoBefore)
		})
	})
})

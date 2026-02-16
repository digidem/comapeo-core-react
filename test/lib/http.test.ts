/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest'

import { createHttp, HTTPError } from '../../src/lib/http.js'

function mockFetch(status: number, body: unknown, headers?: HeadersInit) {
	return async () =>
		new Response(body === null ? null : JSON.stringify(body), {
			status,
			headers: { 'Content-Type': 'application/json', ...headers },
		})
}

describe('createHttp .json()', () => {
	it('returns parsed JSON for 200 OK responses', async () => {
		const http = createHttp(mockFetch(200, { foo: 'bar' }))
		const result = await http.get('http://example.com').json()
		expect(result).toEqual({ foo: 'bar' })
	})

	it('returns empty string for 204 No Content', async () => {
		const http = createHttp(async () => new Response(null, { status: 204 }))
		const result = await http.get('http://example.com').json()
		expect(result).toBe('')
	})

	it('throws a HTTPError for 404 responses', async () => {
		const errorBody = { message: 'Not found' }
		const http = createHttp(mockFetch(404, errorBody))

		await expect(http.get('http://example.com').json()).rejects.toThrow(
			HTTPError,
		)
	})

	it('includes status code and body in the thrown HTTPError', async () => {
		const errorBody = { message: 'Map not found' }
		const http = createHttp(mockFetch(404, errorBody))

		let thrownError: unknown
		try {
			await http.get('http://example.com').json()
		} catch (e) {
			thrownError = e
		}

		expect(thrownError).toBeInstanceOf(HTTPError)
		expect(thrownError).toHaveProperty('status', 404)
		expect(thrownError).toHaveProperty('message', 'Map not found')
	})

	it('throws a HTTPError for 500 responses', async () => {
		const http = createHttp(
			mockFetch(500, { message: 'Internal server error' }),
		)

		let thrownError: unknown
		try {
			await http.get('http://example.com').json()
		} catch (e) {
			thrownError = e
		}

		expect(thrownError).toBeInstanceOf(HTTPError)
		expect(thrownError).toHaveProperty('status', 500)
	})

	it('rethrows non-HTTP errors (e.g. network errors)', async () => {
		const networkError = new TypeError('Failed to fetch')
		const http = createHttp(async () => {
			throw networkError
		})

		await expect(http.get('http://example.com').json()).rejects.toBe(
			networkError,
		)
	})
})

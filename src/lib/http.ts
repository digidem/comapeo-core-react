import type { JsonValue } from 'type-fest'

type HttpInit = RequestInit & { json?: JsonValue }
type ResponsePromise = Promise<Response> & {
	json<T = unknown>(): Promise<T>
	text(): Promise<string>
}
type RequestMethod = (typeof requestMethods)[number]
type Input = string | URL

const requestMethods = [
	'get',
	'post',
	'put',
	'patch',
	'head',
	'delete',
] as const

function createHttp(
	fetchFn: (
		input: string | URL,
		init?: RequestInit,
	) => Promise<Response> = globalThis.fetch,
) {
	const alias =
		(method: RequestMethod) =>
		(input: Input, options: HttpInit = {}): ResponsePromise => {
			const { json, headers, ...rest } = options
			const h = new Headers(headers)

			if (json !== undefined) {
				rest.body = JSON.stringify(json)
				if (!h.has('content-type')) h.set('content-type', 'application/json')
			}

			if (!h.has('accept')) h.set('accept', 'application/json')

			const responsePromise = fetchFn(input, {
				...rest,
				method,
				headers: h,
			}).then((response) => {
				if (!response.ok)
					throw new HTTPError(response, { method, url: input.toString() })
				return response
			}) as ResponsePromise

			responsePromise.json = () =>
				responsePromise.then(async (r) => {
					if (r.status === 204) return ''
					const text = await r.text()
					return text === '' ? '' : JSON.parse(text)
				})

			responsePromise.text = () => responsePromise.then((r) => r.text())

			return responsePromise
		}

	const http = {} as Record<RequestMethod, ReturnType<typeof alias>>
	for (const method of requestMethods) {
		http[method] = alias(method)
	}
	return http
}

/**
 * http - A minimal fetch wrapper to reduce some boilerplate.
 *
 * @example
 * ```js
 *   import http from './http.js'
 *
 *   const data = await http.get('https://api.example.com/items').json()
 *   await http.post('https://api.example.com/items', { json: { name: 'foo' } }).json()
 *
 *   // Custom fetch implementation:
 *   import { createHttp } from './http.js'
 *   const http = createHttp(myCustomFetch)
 * ```
 */
const http = createHttp()

class HTTPError extends Error {
	readonly response: Response

	constructor(response: Response, request: { method: string; url: string }) {
		const code = response.status || response.status === 0 ? response.status : ''
		const title = response.statusText ?? ''
		const status = `${code} ${title}`.trim()
		const reason = status ? `status code ${status}` : 'an unknown error'

		super(`Request failed with ${reason}: ${request.method} ${request.url}`)

		this.name = 'HTTPError'
		this.response = response
	}
}

function isHTTPError(error: unknown): error is HTTPError {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return error instanceof HTTPError || (error as any)?.name === HTTPError.name
}

export default http
export { createHttp, HTTPError, isHTTPError }

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

/**
 * http - A minimal fetch wrapper to reduce some boilerplate.
 *
 * @example
 * ```js
 *   import { createHttp } from './http.js'
 *   const http = createHttp(myCustomFetch)
 *
 *   const data = await http.get('https://api.example.com/items').json()
 *   await http.post('https://api.example.com/items', { json: { name: 'foo' } }).json()
 * ```
 */
function createHttp(
	fetchFn: (
		input: string | URL,
		init?: RequestInit,
	) => Promise<Response> = globalThis.fetch,
) {
	const alias =
		(method: Uppercase<RequestMethod>) =>
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
				responsePromise
					.catch((e) => {
						// For http errors, parse the body as json to get the error details, but rethrow other errors (e.g. network errors)
						if (isHTTPError(e)) return e.response
						throw e
					})
					.then(async (r) => {
						if (r.status === 204) return ''
						const text = await r.text()
						const parsed = text === '' ? '' : JSON.parse(text)
						if (r.ok) return parsed
						throw new HTTPError(r, {
							method: options.method ?? 'GET',
							url: input.toString(),
							...parsed,
						})
					})

			responsePromise.text = () => responsePromise.then((r) => r.text())

			return responsePromise
		}

	const http = {} as Record<RequestMethod, ReturnType<typeof alias>>
	for (const method of requestMethods) {
		http[method] = alias(upperCase(method))
	}
	return http
}

type HTTPErrorObject = {
	message?: string
	code?: string
	[key: string]: unknown
}

class HTTPError extends Error {
	readonly response: Response
	readonly status: number
	readonly code: string = 'UNKNOWN_ERROR';
	[key: string]: unknown

	constructor(
		response: Response,
		{ method, url, ...body }: { method: string; url: string } & HTTPErrorObject,
	) {
		const status = response.status || 500
		const message =
			body.message || `Request failed with ${status}: ${method} ${url}`
		super(message)
		Object.assign(this, body)
		// override status in body with status from response
		this.status = status
		this.name = 'HTTPError'
		this.response = response
	}
}

function isHTTPError(error: unknown): error is HTTPError {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return error instanceof HTTPError || (error as any)?.name === HTTPError.name
}

export { createHttp, HTTPError }

function upperCase<T extends string>(str: T): Uppercase<T> {
	return str.toUpperCase() as Uppercase<T>
}

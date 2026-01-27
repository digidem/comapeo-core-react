/**
 * MapServerState manages the dynamic map server port and provides a fetch wrapper
 * that queues requests until the port is available.
 */
export class MapServerState {
	#port: number | undefined
	#portReadyPromise: Promise<number> | null = null
	#resolvePortReady: ((port: number) => void) | null = null

	/**
	 * Get the current port, or undefined if not yet set.
	 */
	get port(): number | undefined {
		return this.#port
	}

	/**
	 * Set the port once the map server has started.
	 * This resolves any queued fetch requests.
	 */
	setPort(port: number): void {
		this.#port = port
		if (this.#resolvePortReady) {
			this.#resolvePortReady(port)
			this.#resolvePortReady = null
			this.#portReadyPromise = null
		}
	}

	/**
	 * Wait for the port to be set, returning it when available.
	 */
	async waitForPort(): Promise<number> {
		if (this.#port !== undefined) {
			return this.#port
		}
		if (!this.#portReadyPromise) {
			this.#portReadyPromise = new Promise<number>((resolve) => {
				this.#resolvePortReady = resolve
			})
		}
		return this.#portReadyPromise
	}

	/**
	 * Get the base URL for the map server.
	 * Returns undefined if port is not yet set.
	 */
	getBaseUrl(): string | undefined {
		if (this.#port === undefined) return undefined
		return `http://127.0.0.1:${this.#port}`
	}

	/**
	 * Fetch from the map server. Waits for the port to be set before making the request.
	 * @param path - The path to fetch, relative to the base URL (e.g., '/mapShares')
	 * @param init - Optional fetch init options
	 */
	async fetch(path: string, init?: RequestInit): Promise<Response> {
		const port = await this.waitForPort()
		const url = `http://127.0.0.1:${port}${path}`
		return fetch(url, init)
	}
}

/**
 * Factory function to create a `MapServerState` instance. The app should create one instance,
 * call `setPort()` when the map server starts, and pass it to `MapServerProvider`.
 *
 * The returned `MapServerState` instance has the following methods:
 *
 * - `setPort(port)`: Set the port once the map server has started. Resolves any queued fetch requests.
 * - `waitForPort()`: Wait for the port to be set, returning it when available.
 * - `getBaseUrl()`: Get the base URL (`http://127.0.0.1:{port}`), or `undefined` if port is not yet set.
 * - `fetch(path, init?)`: Fetch from the map server. Waits for the port to be set before making the request.
 *
 * @example
 * ```ts
 * const mapServerState = createMapServerState()
 *
 * // Port is not yet set - fetch will queue
 * const pendingResponse = mapServerState.fetch('/mapShares')
 *
 * // Setting the port resolves queued requests
 * mapServerState.setPort(8080)
 *
 * const response = await pendingResponse // now completes
 * ```
 */
export function createMapServerState(): MapServerState {
	return new MapServerState()
}

import type { MapeoClientApi } from '@comapeo/ipc' with { 'resolution-mode': 'import' }

import type {
	MapShareState,
	MapShareStateUpdate,
	ReceivedMapShareOffer,
	ReceivedMapShareState,
} from './map-share-types.js'
import type { MapServerState } from './MapServerState.js'

// TODO: These events need to be added to @comapeo/core
// Using type extension until the events are added to the API
type MapeoClientApiWithMapShare = MapeoClientApi & {
	addListener: (
		event: 'map-share-received' | 'map-share-cancelled',
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		handler: (data: any) => void,
	) => void
	removeListener: (
		event: 'map-share-received' | 'map-share-cancelled',
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		handler: (data: any) => void,
	) => void
}

/** Duration to keep completed shares before cleanup (5 minutes) */
const CLEANUP_DELAY_MS = 5 * 60 * 1000

/**
 * Store for managing received map shares on the receiver side.
 * Handles RPC events for incoming shares and SSE subscriptions for download progress.
 * Uses the useSyncExternalStore pattern for React integration.
 */
export class ReceivedMapShareStore {
	#clientApi: MapeoClientApi
	#mapServerState: MapServerState
	#listeners = new Set<() => void>()
	#shares = new Map<string, ReceivedMapShareState>()
	#downloadEventSources = new Map<string, EventSource>()
	#cleanupTimers = new Map<string, ReturnType<typeof setTimeout>>()
	#isSubscribed = false

	constructor(clientApi: MapeoClientApi, mapServerState: MapServerState) {
		this.#clientApi = clientApi
		this.#mapServerState = mapServerState
	}

	/**
	 * Subscribe to store updates.
	 * Starts listening to RPC events when first subscriber is added.
	 */
	subscribe = (listener: () => void): (() => void) => {
		this.#listeners.add(listener)
		if (!this.#isSubscribed) {
			this.#startRpcListening()
		}
		return () => {
			this.#listeners.delete(listener)
			if (this.#listeners.size === 0) {
				this.#stopRpcListening()
			}
		}
	}

	/**
	 * Get all current map shares.
	 */
	getSnapshot = (): Array<ReceivedMapShareState> => {
		return Array.from(this.#shares.values())
	}

	/**
	 * Get a specific map share by ID.
	 */
	getShareById = (shareId: string): ReceivedMapShareState | undefined => {
		return this.#shares.get(shareId)
	}

	/**
	 * Add a received map share offer.
	 * Called when a map-share-received event is received via RPC.
	 */
	addShare = (offer: ReceivedMapShareOffer): void => {
		this.#shares.set(offer.shareId, {
			...offer,
			state: 'pending',
		})
		this.#notifyListeners()
	}

	/**
	 * Start tracking download progress for a share.
	 * Called after accepting a share and starting the download.
	 */
	startDownloadTracking = (shareId: string, downloadId: string): void => {
		const share = this.#shares.get(shareId)
		if (!share) {
			throw new Error(`Share ${shareId} not found`)
		}

		// Update state to downloading
		this.#updateShare(shareId, {
			state: 'downloading',
			downloadId,
			bytesDownloaded: 0,
		})

		// Start SSE subscription for download progress
		const baseUrl = this.#mapServerState.getBaseUrl()
		if (!baseUrl) {
			throw new Error('Map server port not set')
		}

		const url = `${baseUrl}/downloads/${downloadId}/events`
		const eventSource = new EventSource(url)

		eventSource.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data) as {
					status: string
					bytesDownloaded?: number
					error?: { message: string; code: string }
				}
				this.#handleDownloadUpdate(shareId, data)
			} catch {
				// Ignore malformed events
			}
		}

		eventSource.onerror = () => {
			// Connection error - mark as error state
			const currentShare = this.#shares.get(shareId)
			if (currentShare && currentShare.state === 'downloading') {
				this.#updateShare(shareId, {
					state: 'error',
					error: new Error('Download connection lost'),
				})
			}
			this.#closeDownloadSSE(shareId)
		}

		this.#downloadEventSources.set(shareId, eventSource)
	}

	/**
	 * Mark a share as rejected.
	 */
	markRejected = (shareId: string, reason?: string): void => {
		this.#updateShare(shareId, { state: 'rejected', reason })
		this.#scheduleCleanup(shareId)
	}

	/**
	 * Mark a share as aborted (receiver aborted the download).
	 */
	markAborted = (shareId: string): void => {
		this.#closeDownloadSSE(shareId)
		this.#updateShare(shareId, { state: 'aborted' })
		this.#scheduleCleanup(shareId)
	}

	/**
	 * Cleanup all resources.
	 */
	cleanup = (): void => {
		this.#stopRpcListening()
		for (const es of this.#downloadEventSources.values()) {
			es.close()
		}
		this.#downloadEventSources.clear()
		for (const timer of this.#cleanupTimers.values()) {
			clearTimeout(timer)
		}
		this.#cleanupTimers.clear()
	}

	#startRpcListening = (): void => {
		const clientApi = this.#clientApi as MapeoClientApiWithMapShare
		clientApi.addListener('map-share-received', this.#handleMapShareReceived)
		clientApi.addListener('map-share-cancelled', this.#handleMapShareCancelled)
		this.#isSubscribed = true
	}

	#stopRpcListening = (): void => {
		const clientApi = this.#clientApi as MapeoClientApiWithMapShare
		clientApi.removeListener('map-share-received', this.#handleMapShareReceived)
		clientApi.removeListener(
			'map-share-cancelled',
			this.#handleMapShareCancelled,
		)
		this.#isSubscribed = false
	}

	#handleMapShareReceived = (offer: ReceivedMapShareOffer): void => {
		this.addShare(offer)
	}

	#handleMapShareCancelled = ({ shareId }: { shareId: string }): void => {
		const share = this.#shares.get(shareId)
		if (share && (share.state === 'pending' || share.state === 'downloading')) {
			this.#closeDownloadSSE(shareId)
			this.#updateShare(shareId, { state: 'cancelled' })
			this.#scheduleCleanup(shareId)
		}
	}

	#handleDownloadUpdate = (
		shareId: string,
		update: {
			status: string
			bytesDownloaded?: number
			error?: { message: string; code: string }
		},
	): void => {
		const share = this.#shares.get(shareId)
		if (!share || share.state !== 'downloading') return

		switch (update.status) {
			case 'downloading':
				if (typeof update.bytesDownloaded === 'number') {
					this.#updateShare(shareId, {
						state: 'downloading',
						downloadId: share.downloadId,
						bytesDownloaded: update.bytesDownloaded,
					})
				}
				break
			case 'completed':
				this.#closeDownloadSSE(shareId)
				this.#updateShare(shareId, { state: 'completed' })
				this.#scheduleCleanup(shareId)
				break
			case 'error':
				this.#closeDownloadSSE(shareId)
				this.#updateShare(shareId, {
					state: 'error',
					error: new Error(update.error?.message || 'Download failed'),
				})
				break
			case 'canceled':
				this.#closeDownloadSSE(shareId)
				this.#updateShare(shareId, { state: 'cancelled' })
				this.#scheduleCleanup(shareId)
				break
			case 'aborted':
				this.#closeDownloadSSE(shareId)
				this.#updateShare(shareId, { state: 'aborted' })
				break
		}
	}

	#updateShare = (
		shareId: string,
		updates: Partial<ReceivedMapShareState>,
	): void => {
		const existing = this.#shares.get(shareId)
		if (existing) {
			this.#shares.set(shareId, {
				...existing,
				...updates,
			} as ReceivedMapShareState)
			this.#notifyListeners()
		}
	}

	#closeDownloadSSE = (shareId: string): void => {
		const es = this.#downloadEventSources.get(shareId)
		if (es) {
			es.close()
			this.#downloadEventSources.delete(shareId)
		}
	}

	#scheduleCleanup = (shareId: string): void => {
		// Cancel any existing cleanup timer
		const existingTimer = this.#cleanupTimers.get(shareId)
		if (existingTimer) {
			clearTimeout(existingTimer)
		}

		const timer = setTimeout(() => {
			this.#shares.delete(shareId)
			this.#cleanupTimers.delete(shareId)
			this.#notifyListeners()
		}, CLEANUP_DELAY_MS)

		this.#cleanupTimers.set(shareId, timer)
	}

	#notifyListeners = (): void => {
		for (const listener of this.#listeners) {
			listener()
		}
	}
}

/**
 * Store for tracking a sent map share's progress via SSE.
 * One instance per active share, lazily subscribes to SSE when first listener is added.
 */
export class SentMapShareStore {
	#shareId: string
	#mapServerState: MapServerState
	#listeners = new Set<() => void>()
	#eventSource: EventSource | null = null
	#state: MapShareState
	#error: Error | null = null

	constructor(
		shareId: string,
		mapServerState: MapServerState,
		initialState: MapShareState,
	) {
		this.#shareId = shareId
		this.#mapServerState = mapServerState
		this.#state = initialState
	}

	/**
	 * Subscribe to state updates.
	 * Starts SSE subscription when first subscriber is added.
	 */
	subscribe = (listener: () => void): (() => void) => {
		this.#listeners.add(listener)
		if (this.#listeners.size === 1) {
			this.#startSSE()
		}
		return () => {
			this.#listeners.delete(listener)
			if (this.#listeners.size === 0) {
				this.#stopSSE()
			}
		}
	}

	/**
	 * Get current state snapshot.
	 * Throws if there was an SSE error.
	 */
	getSnapshot = (): MapShareState => {
		if (this.#error) throw this.#error
		return this.#state
	}

	#startSSE = (): void => {
		const baseUrl = this.#mapServerState.getBaseUrl()
		if (!baseUrl) {
			// Port not ready yet - we'll just use initial state
			// Could potentially wait for port, but for now just return initial state
			return
		}

		const url = `${baseUrl}/mapShares/${this.#shareId}/events`
		this.#eventSource = new EventSource(url)

		this.#eventSource.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data) as MapShareStateUpdate
				// Merge the update with existing state
				this.#state = { ...this.#state, ...data }
				this.#notifyListeners()
			} catch {
				// Ignore malformed events
			}
		}

		this.#eventSource.onerror = () => {
			this.#error = new Error('SSE connection error')
			this.#notifyListeners()
		}
	}

	#stopSSE = (): void => {
		if (this.#eventSource) {
			this.#eventSource.close()
			this.#eventSource = null
		}
	}

	#notifyListeners = (): void => {
		for (const listener of this.#listeners) {
			listener()
		}
	}
}

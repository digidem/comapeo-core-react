/**
 * @vitest-environment node
 */
import { QueryClient } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createMapServerApi } from '../../src/contexts/MapServer.js'
import {
	createReceivedMapSharesStore,
	createSentMapSharesStore,
	type ReceivedMapSharesStore,
	type SentMapSharesStore,
} from '../../src/lib/map-shares-stores.js'
import {
	createMockClientApi,
	type MockClientApi,
} from '../helpers/client-api-mock.js'
import { OSM_BRIGHT_Z6 } from '../helpers/constants.js'
import { startMapServer, type ServerInstance } from '../helpers/map-server.js'
import {
	createMapShareFromServerShare,
	createShare,
	waitForStoreState,
} from './map-shares-test-utils.js'

describe('ReceivedMapSharesStore', () => {
	let mockClientApi: MockClientApi
	let sender: ServerInstance
	let receiver: ServerInstance
	let store: ReceivedMapSharesStore

	beforeEach(async (t) => {
		mockClientApi = createMockClientApi()
		sender = await startMapServer(t, { customMapPath: OSM_BRIGHT_Z6 })
		receiver = await startMapServer(t)

		store = createReceivedMapSharesStore({
			// @ts-expect-error - We're only mocking what we need
			clientApi: mockClientApi,
			mapServerApi: createMapServerApi({
				getBaseUrl: async () => new URL(receiver.localBaseUrl),
			}),
		})
		t.onTestFinished(store.listen())
	})

	describe('client api listener', () => {
		function createStore() {
			return createReceivedMapSharesStore({
				// @ts-expect-error - We're only mocking what we need
				clientApi: mockClientApi,
				mapServerApi: createMapServerApi({
					getBaseUrl: async () => new URL(receiver.localBaseUrl),
				}),
			})
		}

		it('should not attach a listener until listen() is called', () => {
			const before = mockClientApi.listeners.get('map-share')?.length ?? 0

			const teardown = createStore().listen()

			expect(mockClientApi.listeners.get('map-share')).toHaveLength(before + 1)

			teardown()
		})

		it('should remove its listener on teardown', () => {
			const before = mockClientApi.listeners.get('map-share')?.length ?? 0

			const teardown = createStore().listen()
			teardown()

			expect(mockClientApi.listeners.get('map-share')).toHaveLength(before)
		})

		it('should not register a second listener when listen() is called twice', async () => {
			const before = mockClientApi.listeners.get('map-share')?.length ?? 0

			const doubleListeningStore = createStore()
			const teardown = doubleListeningStore.listen()
			const secondTeardown = doubleListeningStore.listen()

			expect(mockClientApi.listeners.get('map-share')).toHaveLength(before + 1)
			expect(secondTeardown).toBe(teardown)

			const serverShare = await createShare(sender, receiver)
			mockClientApi.emit(
				'map-share',
				createMapShareFromServerShare(sender.deviceId, serverShare),
			)
			expect(doubleListeningStore.getSnapshot()).toHaveLength(1)

			teardown()
			expect(mockClientApi.listeners.get('map-share')).toHaveLength(before)
		})

		it('should re-attach when listen() is called again after teardown', () => {
			const before = mockClientApi.listeners.get('map-share')?.length ?? 0

			const relisteningStore = createStore()
			relisteningStore.listen()()

			const teardown = relisteningStore.listen()
			expect(mockClientApi.listeners.get('map-share')).toHaveLength(before + 1)

			teardown()
			expect(mockClientApi.listeners.get('map-share')).toHaveLength(before)
		})

		it('should ignore map-share events after teardown', async () => {
			const serverShare = await createShare(sender, receiver)
			const mapShare = createMapShareFromServerShare(
				sender.deviceId,
				serverShare,
			)

			const torndownStore = createStore()
			const teardown = torndownStore.listen()
			teardown()

			mockClientApi.emit('map-share', mapShare)

			expect(torndownStore.getSnapshot()).toHaveLength(0)
		})
	})

	describe('subscription', () => {
		it('should notify all subscribers when state changes', async () => {
			const serverShare = await createShare(sender, receiver)
			const mapShare = createMapShareFromServerShare(
				sender.deviceId,
				serverShare,
			)

			const listener1 = vi.fn()
			const listener2 = vi.fn()
			const listener3 = vi.fn()

			store.subscribe(listener1)
			store.subscribe(listener2)
			store.subscribe(listener3)

			mockClientApi.emit('map-share', mapShare)

			expect(listener1).toHaveBeenCalledTimes(1)
			expect(listener2).toHaveBeenCalledTimes(1)
			expect(listener3).toHaveBeenCalledTimes(1)
		})

		it('should stop notifying after unsubscribe', async () => {
			const serverShare = await createShare(sender, receiver)
			const mapShare = createMapShareFromServerShare(
				sender.deviceId,
				serverShare,
			)

			const listener = vi.fn()
			const unsubscribe = store.subscribe(listener)

			mockClientApi.emit('map-share', mapShare)
			expect(listener).toHaveBeenCalledTimes(1)

			unsubscribe()

			// Create another share event
			const serverShare2 = await createShare(sender, receiver)
			const mapShare2 = createMapShareFromServerShare(
				sender.deviceId,
				serverShare2,
			)
			mockClientApi.emit('map-share', mapShare2)

			// Should still be 1 because we unsubscribed
			expect(listener).toHaveBeenCalledTimes(1)
		})
	})

	describe('event source monitoring', () => {
		let senderMockClientApi: MockClientApi
		let sentStore: SentMapSharesStore

		beforeEach(() => {
			senderMockClientApi = createMockClientApi()
			sentStore = createSentMapSharesStore({
				// @ts-expect-error - We're only mocking what we need
				clientApi: senderMockClientApi,
				mapServerApi: createMapServerApi({
					getBaseUrl: async () => new URL(sender.localBaseUrl),
				}),
			})
		})

		it('should update status when sender cancels during download', async () => {
			// Sender creates a share
			await sentStore.actions.createAndSend({
				receiverDeviceId: receiver.deviceId,
				mapId: 'custom',
			})

			const serverShare = sentStore.getSnapshot()[0]!

			// Simulate receiver getting the share (as if via comapeo-core event)
			const mapShare = createMapShareFromServerShare(
				sender.deviceId,
				serverShare,
			)
			mockClientApi.emit('map-share', mapShare)

			// Receiver starts downloading
			await store.actions.download({ shareId: mapShare.shareId })
			expect(store.getSnapshot()[0]).toHaveProperty('status', 'downloading')

			// Sender cancels the share
			await sentStore.actions.cancel({ shareId: mapShare.shareId })

			// Receiver's store should see the status update via EventSource
			await waitForStoreState(store, (state) => state[0]?.status === 'canceled')

			const snapshot = store.getSnapshot()
			expect(snapshot[0]).toHaveProperty('status', 'canceled')
		})
	})
})

// The event stream is the only thing that ever moves a share out of
// `downloading`. If the map server goes away for good — it dies with the
// backend on Android — the stream never re-establishes, and without an error
// path the share would sit in `downloading` for the life of the app.
describe('map share event stream failures', () => {
	const MAP_SHARE = {
		shareId: 'share-id',
		senderDeviceId: 'sender-device-id',
		senderDeviceName: 'Sender',
		mapShareReceivedAt: Date.now(),
		mapId: 'custom',
		estimatedSizeBytes: 100,
		mapShareUrls: ['http://127.0.0.1:1/'],
	}

	function createStoreWithFakeEventSource() {
		const close = vi.fn()
		let onScheduleReconnect: ((info: { delay: number }) => void) | undefined
		let onMessage: ((event: { data: string }) => void) | undefined

		const mapServerApi = {
			post: () => ({ json: async () => ({ downloadId: 'download-id' }) }),
			createEventSource: (options: {
				onScheduleReconnect?: (info: { delay: number }) => void
				onMessage?: (event: { data: string }) => void
			}) => {
				onScheduleReconnect = options.onScheduleReconnect
				onMessage = options.onMessage
				return { close }
			},
		}

		const mockClientApi = createMockClientApi()
		const store = createReceivedMapSharesStore({
			// @ts-expect-error - We're only mocking what we need
			clientApi: mockClientApi,
			// @ts-expect-error - We're only mocking what we need
			mapServerApi,
			queryClient: new QueryClient(),
		})

		return {
			store,
			close,
			async startDownload() {
				mockClientApi.emit('map-share', MAP_SHARE)
				await store.actions.download({ shareId: MAP_SHARE.shareId })
			},
			dropStream: () => onScheduleReconnect?.({ delay: 0 }),
			emitProgress: (bytesDownloaded: number) =>
				onMessage?.({
					data: JSON.stringify({ status: 'downloading', bytesDownloaded }),
				}),
		}
	}

	it('moves the share to error when the stream cannot be re-established', async (t) => {
		const fake = createStoreWithFakeEventSource()
		t.onTestFinished(fake.store.listen())

		await fake.startDownload()
		expect(fake.store.getSnapshot()[0]).toHaveProperty('status', 'downloading')

		// A single dropped connection is not a failure: the client reconnects
		fake.dropStream()
		expect(fake.store.getSnapshot()[0]).toHaveProperty('status', 'downloading')

		fake.dropStream()
		fake.dropStream()
		fake.dropStream()

		expect(fake.store.getSnapshot()[0]).toMatchObject({
			status: 'error',
			error: { code: 'EVENT_STREAM_ERROR' },
		})
		expect(fake.close).toHaveBeenCalled()
	})

	it('keeps monitoring a stream that recovers between drops', async (t) => {
		const fake = createStoreWithFakeEventSource()
		t.onTestFinished(fake.store.listen())

		await fake.startDownload()

		for (let i = 1; i <= 10; i++) {
			fake.dropStream()
			fake.dropStream()
			fake.emitProgress(i)
		}

		expect(fake.store.getSnapshot()[0]).toMatchObject({
			status: 'downloading',
			bytesDownloaded: 10,
		})
	})
})

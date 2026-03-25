/**
 * @vitest-environment node
 */
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

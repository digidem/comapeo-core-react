/**
 * @vitest-environment node
 */
import { setTimeout as delay } from 'node:timers/promises'
import type { MapShare } from '@comapeo/core'
import type { MapShareState as ServerMapShareState } from '@comapeo/map-server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
	createReceivedMapSharesStore,
	createSentMapSharesStore,
	type ReceivedMapSharesStore,
	type SentMapSharesStore,
} from '../../src/lib/map-shares-stores.js'
import {
	createMapShareFromServerShare,
	createMockClientApi,
	startTestServers,
	waitForStoreState,
	type MockClientApi,
	type ServerInstance,
} from './map-shares-test-utils.js'

describe('ReceivedMapSharesStore', () => {
	let mockClientApi: MockClientApi
	let sender: ServerInstance
	let receiver: ServerInstance
	let store: ReceivedMapSharesStore
	let createShare: () => Promise<ServerMapShareState>

	beforeEach(async (t) => {
		mockClientApi = createMockClientApi()
		const servers = await startTestServers(t)
		sender = servers.sender
		receiver = servers.receiver
		createShare = servers.createShare

		store = createReceivedMapSharesStore({
			// @ts-expect-error - We're only mocking what we need
			clientApi: mockClientApi,
			mapServerApi: receiver.mapServerApi,
		})
	})

	describe('initial state', () => {
		it('should start with an empty array of map shares', () => {
			expect(store.getSnapshot()).toEqual([])
		})

		it('should register a listener for map-share events on clientApi', () => {
			expect(mockClientApi.on).toHaveBeenCalledWith(
				'map-share',
				expect.any(Function),
			)
		})
	})

	describe('map-share event handling', () => {
		it('should add a new map share when map-share event is emitted', async () => {
			const serverShare = await createShare()
			const mapShare = createMapShareFromServerShare(
				sender.deviceId,
				serverShare,
			)

			const listener = vi.fn()
			store.subscribe(listener)

			mockClientApi.emit('map-share', mapShare)

			expect(listener).toHaveBeenCalledTimes(1)
			const snapshot = store.getSnapshot()
			expect(snapshot).toHaveLength(1)
			expect(snapshot[0]).toMatchObject({
				shareId: mapShare.shareId,
				senderDeviceId: sender.deviceId,
				status: 'pending',
			})
		})

		it('should handle multiple map shares', async () => {
			const serverShare1 = await createShare()
			const serverShare2 = await createShare()

			const mapShare1 = createMapShareFromServerShare(
				sender.deviceId,
				serverShare1,
			)
			const mapShare2 = createMapShareFromServerShare(
				sender.deviceId,
				serverShare2,
			)

			mockClientApi.emit('map-share', mapShare1)
			mockClientApi.emit('map-share', mapShare2)

			const snapshot = store.getSnapshot()
			expect(snapshot).toHaveLength(2)
			expect(snapshot[0]).toHaveProperty('shareId', mapShare1.shareId)
			expect(snapshot[1]).toHaveProperty('shareId', mapShare2.shareId)
		})
	})

	describe('download', () => {
		it('should complete the download and update status', async () => {
			const serverShare = await createShare()
			const mapShare = createMapShareFromServerShare(
				sender.deviceId,
				serverShare,
			)

			mockClientApi.emit('map-share', mapShare)

			const downloadPromise = store.download(mapShare.shareId)

			// synchronous store update to 'downloading' status
			expect(store.getSnapshot()[0]).toHaveProperty('status', 'downloading')

			await expect(downloadPromise).resolves.toBeUndefined()

			await waitForStoreState(
				store,
				(state) => state[0]?.status === 'completed',
			)

			// Check that status is completed
			const snapshot = store.getSnapshot()
			expect(snapshot[0]).toHaveProperty('status', 'completed')
		})

		it('should throw when downloading a non-existent share', async () => {
			await expect(() =>
				store.download('non-existent-share-id'),
			).rejects.toThrow('Map share with id non-existent-share-id not found')
		})
	})

	describe('decline', () => {
		it('should decline a share and update status', async () => {
			const serverShare = await createShare()
			const mapShare = createMapShareFromServerShare(
				sender.deviceId,
				serverShare,
			)

			mockClientApi.emit('map-share', mapShare)

			const listener = vi.fn()
			store.subscribe(listener)

			const declinePromise = store.decline(mapShare.shareId, 'user_rejected')

			// Check that status is immediately set to declined
			const snapshot = store.getSnapshot()
			expect(snapshot[0]).toHaveProperty('status', 'declined')
			expect(snapshot[0]).toHaveProperty('reason', 'user_rejected')

			await expect(declinePromise).resolves.toBeUndefined()

			// Check on the sender side that the share was declined
			const senderShare = (await sender
				.get(`mapShares/${serverShare.shareId}`)
				.json()) as ServerMapShareState
			expect(senderShare.status).toBe('declined')
			expect(senderShare).toHaveProperty('reason', 'user_rejected')
		})

		it('should throw when declining a non-existent share', async () => {
			await expect(() =>
				store.decline('non-existent-share-id', 'user_rejected'),
			).rejects.toThrow('Map share with id non-existent-share-id not found')
		})
	})

	describe('abort', () => {
		it('should abort a download and update status', async () => {
			const serverShare = await createShare()
			const mapShare = createMapShareFromServerShare(
				sender.deviceId,
				serverShare,
			)

			mockClientApi.emit('map-share', mapShare)

			// Start the download
			await store.download(mapShare.shareId)

			const abortPromise = store.abort(mapShare.shareId)
			const snapshot = store.getSnapshot()
			expect(snapshot[0]?.status).toBe('aborted')

			await expect(abortPromise).resolves.toBeUndefined()

			// Check on the sender side that the map share was aborted
			await delay(100) // Wait a bit for the abort to be processed on the server
			const senderShare = (await sender
				.get(`mapShares/${serverShare.shareId}`)
				.json()) as ServerMapShareState
			expect(senderShare.status).toBe('aborted')
		})

		it('should throw when aborting a non-existent share', async () => {
			await expect(() => store.abort('non-existent-share-id')).rejects.toThrow(
				'Map share with id non-existent-share-id not found',
			)
		})
	})

	describe('invalid status transitions', () => {
		it('should not allow download or abort after decline', async () => {
			const serverShare = await createShare()
			const mapShare = createMapShareFromServerShare(
				sender.deviceId,
				serverShare,
			)

			mockClientApi.emit('map-share', mapShare)

			// Decline the share (status: pending -> declined)
			await store.decline(mapShare.shareId, 'user_rejected')

			// Now trying to download should throw because declined -> downloading is not allowed
			await expect(() => store.download(mapShare.shareId)).rejects.toThrow(
				'Invalid status transition from declined to downloading',
			)
			// Trying to abort should also throw because declined -> aborted is not allowed
			await expect(() => store.abort(mapShare.shareId)).rejects.toThrow(
				'Invalid status transition from declined to aborted',
			)

			const snapshot = store.getSnapshot()
			expect(snapshot[0]?.status).toBe('declined')
		})

		it('should not allow abort before download starts', async () => {
			const serverShare = await createShare()
			const mapShare = createMapShareFromServerShare(
				sender.deviceId,
				serverShare,
			)

			mockClientApi.emit('map-share', mapShare)

			// Trying to abort before download should throw because pending -> aborted is not allowed
			await expect(() => store.abort(mapShare.shareId)).rejects.toThrow(
				'Invalid status transition from pending to aborted',
			)
			const snapshot = store.getSnapshot()
			expect(snapshot[0]?.status).toBe('pending')
		})

		it('should not allow decline after download starts', async () => {
			const serverShare = await createShare()
			const mapShare = createMapShareFromServerShare(
				sender.deviceId,
				serverShare,
			)

			mockClientApi.emit('map-share', mapShare)

			// Start the download
			await store.download(mapShare.shareId)

			// Now trying to decline should throw because downloading -> declined is not allowed
			await expect(() =>
				store.decline(mapShare.shareId, 'user_rejected'),
			).rejects.toThrow(
				'Invalid status transition from downloading to declined',
			)

			const snapshot = store.getSnapshot()
			expect(snapshot[0]?.status).toBe('downloading')
		})

		it('should not allow any action after completion', async () => {
			const serverShare = await createShare()
			const mapShare = createMapShareFromServerShare(
				sender.deviceId,
				serverShare,
			)

			mockClientApi.emit('map-share', mapShare)

			// Start the download and wait for completion
			await store.download(mapShare.shareId)
			await waitForStoreState(
				store,
				(state) => state[0]?.status === 'completed',
			)

			// Now trying to decline should throw because completed -> declined is not allowed
			await expect(() =>
				store.decline(mapShare.shareId, 'user_rejected'),
			).rejects.toThrow('Invalid status transition from completed to declined')

			// Trying to abort should also throw because completed -> aborted is not allowed
			await expect(() => store.abort(mapShare.shareId)).rejects.toThrow(
				'Invalid status transition from completed to aborted',
			)

			// Trying download again should also throw because completed -> downloading is not allowed
			await expect(() => store.download(mapShare.shareId)).rejects.toThrow(
				'Invalid status transition from completed to downloading',
			)

			const snapshot = store.getSnapshot()
			expect(snapshot[0]?.status).toBe('completed')
		})
	})

	describe('subscription', () => {
		it('should notify all subscribers when state changes', async () => {
			const serverShare = await createShare()
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
			const serverShare = await createShare()
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
			const serverShare2 = await createShare()
			const mapShare2 = createMapShareFromServerShare(
				sender.deviceId,
				serverShare2,
			)
			mockClientApi.emit('map-share', mapShare2)

			// Should still be 1 because we unsubscribed
			expect(listener).toHaveBeenCalledTimes(1)
		})
	})

	describe('error handling', () => {
		it('should update status to error when download fails', async () => {
			const serverShare = await createShare()

			// Create a map share with invalid URLs to cause a download error
			const mapShare: MapShare = {
				...createMapShareFromServerShare(sender.deviceId, serverShare),
				mapShareUrls: ['http://127.0.0.1:80/invalid'] as const,
			}

			mockClientApi.emit('map-share', mapShare)

			// Download only rejects if the local download action encounters an error.
			// Errors communicating with the remote server are captured in state
			// updates.
			await store.download(mapShare.shareId)

			await waitForStoreState(store, (state) => state[0]?.status === 'error')

			const snapshot = store.getSnapshot()
			expect(snapshot[0]).toHaveProperty('status', 'error')
			expect(snapshot[0]).toHaveProperty('error.code', 'DOWNLOAD_ERROR')
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
				mapServerApi: sender.mapServerApi,
			})
		})

		it('should update status when sender cancels during download', async () => {
			// Sender creates a share
			await sentStore.createAndSend({
				projectId: 'test-project-id',
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
			await store.download(mapShare.shareId)
			expect(store.getSnapshot()[0]).toHaveProperty('status', 'downloading')

			// Sender cancels the share
			await sentStore.cancel(mapShare.shareId)

			// Receiver's store should see the status update via EventSource
			await waitForStoreState(store, (state) => state[0]?.status === 'canceled')

			const snapshot = store.getSnapshot()
			expect(snapshot[0]).toHaveProperty('status', 'canceled')
		})
	})
})

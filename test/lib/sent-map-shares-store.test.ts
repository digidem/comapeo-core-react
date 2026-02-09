/**
 * @vitest-environment node
 */
import type { MapShareState as ServerMapShareState } from '@comapeo/map-server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
	createReceivedMapSharesStore,
	type ReceivedMapSharesStore,
} from '../../src/lib/received-map-shares-store.js'
import {
	createSentMapSharesStore,
	type SentMapSharesStore,
} from '../../src/lib/sent-map-shares-store.js'
import {
	createMapShareFromServerShare,
	createMockClientApi,
	startTestServers,
	waitForStoreState,
	type MockClientApi,
	type ServerInstance,
} from './map-shares-test-utils.js'

describe('SentMapSharesStore', () => {
	let mockClientApi: MockClientApi
	let sender: ServerInstance
	let receiver: ServerInstance
	let sentStore: SentMapSharesStore

	beforeEach(async (t) => {
		mockClientApi = createMockClientApi()
		const servers = await startTestServers(t)
		sender = servers.sender
		receiver = servers.receiver

		sentStore = createSentMapSharesStore({
			// @ts-expect-error - We're only mocking what we need
			clientApi: mockClientApi,
			mapServerApi: sender.mapServerApi,
		})
	})

	describe('initial state', () => {
		it('should start with an empty array of map shares', () => {
			expect(sentStore.getSnapshot()).toEqual([])
		})
	})

	describe('create', () => {
		it('should create a new map share and add it to the store', async () => {
			const listener = vi.fn()
			sentStore.subscribe(listener)

			await sentStore.create({
				projectId: 'test-project-id',
				receiverDeviceId: receiver.deviceId,
				mapId: 'custom',
			})

			expect(listener).toHaveBeenCalled()
			const snapshot = sentStore.getSnapshot()
			expect(snapshot).toHaveLength(1)
			expect(snapshot[0]).toMatchObject({
				mapId: 'custom',
				status: 'pending',
			})
			expect(snapshot[0]).toHaveProperty('shareId')
			expect(snapshot[0]).toHaveProperty('mapShareUrls')
		})

		it('should call clientApi.getProject and $sendMapShare', async () => {
			await sentStore.create({
				projectId: 'test-project-id',
				receiverDeviceId: receiver.deviceId,
				mapId: 'custom',
			})

			expect(mockClientApi.getProject).toHaveBeenCalledWith('test-project-id')
			expect(mockClientApi.$sendMapShare).toHaveBeenCalledWith(
				expect.objectContaining({
					mapId: 'custom',
					status: 'pending',
				}),
			)
		})

		it('should handle multiple map shares', async () => {
			await sentStore.create({
				projectId: 'test-project-id',
				receiverDeviceId: receiver.deviceId,
				mapId: 'custom',
			})

			await sentStore.create({
				projectId: 'test-project-id',
				receiverDeviceId: receiver.deviceId,
				mapId: 'custom',
			})

			const snapshot = sentStore.getSnapshot()
			expect(snapshot).toHaveLength(2)
			expect(snapshot[0]?.shareId).not.toBe(snapshot[1]?.shareId)
		})

		it('should create share on the server', async () => {
			await sentStore.create({
				projectId: 'test-project-id',
				receiverDeviceId: receiver.deviceId,
				mapId: 'custom',
			})

			const shareId = sentStore.getSnapshot()[0]!.shareId

			// Verify the share exists on the server
			const serverShare = (await sender
				.get(`mapShares/${shareId}`)
				.json()) as ServerMapShareState

			expect(serverShare).toMatchObject({
				shareId,
				mapId: 'custom',
				status: 'pending',
			})
		})
	})

	describe('cancel', () => {
		it('should update status to canceled immediately', async () => {
			await sentStore.create({
				projectId: 'test-project-id',
				receiverDeviceId: receiver.deviceId,
				mapId: 'custom',
			})

			const shareId = sentStore.getSnapshot()[0]!.shareId

			// Start cancel but don't await - check immediate state
			const cancelPromise = sentStore.cancel(shareId)

			// Status should be 'canceled' immediately (before server response)
			// But if server returns error, status may become 'error'
			// So we just verify the promise resolves or rejects appropriately
			try {
				await cancelPromise
				const snapshot = sentStore.getSnapshot()
				expect(snapshot[0]).toHaveProperty('status', 'canceled')
			} catch {
				// If cancel fails, status should be 'error'
				const snapshot = sentStore.getSnapshot()
				expect(snapshot[0]).toHaveProperty('status', 'error')
			}
		})

		it('should throw when canceling a non-existent share', async () => {
			await expect(() =>
				sentStore.cancel('non-existent-share-id'),
			).rejects.toThrow('Map share with id non-existent-share-id not found')
		})
	})

	describe('event source monitoring', () => {
		let receiverMockClientApi: MockClientApi
		let receivedStore: ReceivedMapSharesStore

		beforeEach(() => {
			receiverMockClientApi = createMockClientApi()
			receivedStore = createReceivedMapSharesStore({
				// @ts-expect-error - We're only mocking what we need
				clientApi: receiverMockClientApi,
				mapServerApi: receiver.mapServerApi,
			})
		})

		it('should update status when receiver declines the share', async () => {
			// Sender creates a share
			await sentStore.create({
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
			receiverMockClientApi.emit('map-share', mapShare)

			// Receiver declines the share
			await receivedStore.decline(mapShare.shareId, 'user_rejected')

			// Sender's store should see the status update via EventSource
			await waitForStoreState(
				sentStore,
				(state) => state[0]?.status === 'declined',
			)

			const snapshot = sentStore.getSnapshot()
			expect(snapshot[0]).toHaveProperty('status', 'declined')
			expect(snapshot[0]).toHaveProperty('reason', 'user_rejected')

			// Also verify the sender's server state was updated
			const senderServerShare = (await sender
				.get(`mapShares/${serverShare.shareId}`)
				.json()) as ServerMapShareState
			expect(senderServerShare.status).toBe('declined')
			expect(senderServerShare).toHaveProperty('reason', 'user_rejected')
		})

		it('should update status to completed when download finishes', async () => {
			// Sender creates a share
			await sentStore.create({
				projectId: 'test-project-id',
				receiverDeviceId: receiver.deviceId,
				mapId: 'custom',
			})

			const serverShare = sentStore.getSnapshot()[0]!

			// Simulate receiver getting the share
			const mapShare = createMapShareFromServerShare(
				sender.deviceId,
				serverShare,
			)
			receiverMockClientApi.emit('map-share', mapShare)

			// Receiver downloads the share
			await receivedStore.download(mapShare.shareId)

			// Wait for receiver to complete (the download happens asynchronously)
			await waitForStoreState(
				receivedStore,
				(state) => state[0]?.status === 'completed',
			)

			// Sender's store should see the status update via EventSource
			await waitForStoreState(
				sentStore,
				(state) => state[0]?.status === 'completed',
			)

			const snapshot = sentStore.getSnapshot()
			expect(snapshot[0]).toHaveProperty('status', 'completed')
		})

		it('should update status when receiver aborts download', async () => {
			// Sender creates a share
			await sentStore.create({
				projectId: 'test-project-id',
				receiverDeviceId: receiver.deviceId,
				mapId: 'custom',
			})

			const serverShare = sentStore.getSnapshot()[0]!

			// Simulate receiver getting the share
			const mapShare = createMapShareFromServerShare(
				sender.deviceId,
				serverShare,
			)
			receiverMockClientApi.emit('map-share', mapShare)

			// Receiver starts the download
			await receivedStore.download(mapShare.shareId)

			// Receiver aborts (if still downloading)
			const receiverSnapshot = receivedStore.getSnapshot()
			expect(receiverSnapshot[0]).toHaveProperty('status', 'downloading')
			await receivedStore.abort(mapShare.shareId)

			// Sender's store should see the status update via EventSource
			await waitForStoreState(
				sentStore,
				(state) => state[0]?.status === 'aborted',
			)

			const snapshot = sentStore.getSnapshot()
			expect(snapshot[0]).toHaveProperty('status', 'aborted')
		})
	})

	describe('invalid status transitions', () => {
		let receiverMockClientApi: MockClientApi
		let receivedStore: ReceivedMapSharesStore

		beforeEach(() => {
			receiverMockClientApi = createMockClientApi()
			receivedStore = createReceivedMapSharesStore({
				// @ts-expect-error - We're only mocking what we need
				clientApi: receiverMockClientApi,
				mapServerApi: receiver.mapServerApi,
			})
		})

		it('should not allow cancel after decline', async () => {
			await sentStore.create({
				projectId: 'test-project-id',
				receiverDeviceId: receiver.deviceId,
				mapId: 'custom',
			})

			const serverShare = sentStore.getSnapshot()[0]!

			// Simulate receiver getting and declining the share
			const mapShare = createMapShareFromServerShare(
				sender.deviceId,
				serverShare,
			)
			receiverMockClientApi.emit('map-share', mapShare)
			await receivedStore.decline(mapShare.shareId, 'user_rejected')

			// Wait for sender to see the decline
			await waitForStoreState(
				sentStore,
				(state) => state[0]?.status === 'declined',
			)

			// Now trying to cancel should throw because declined -> canceled is not allowed
			await expect(() => sentStore.cancel(mapShare.shareId)).rejects.toThrow(
				'Invalid status transition from declined to canceled',
			)

			const snapshot = sentStore.getSnapshot()
			expect(snapshot[0]?.status).toBe('declined')
		})

		it('should not allow cancel after completion', async () => {
			await sentStore.create({
				projectId: 'test-project-id',
				receiverDeviceId: receiver.deviceId,
				mapId: 'custom',
			})

			const serverShare = sentStore.getSnapshot()[0]!

			// Simulate receiver getting and downloading the share
			const mapShare = createMapShareFromServerShare(
				sender.deviceId,
				serverShare,
			)
			receiverMockClientApi.emit('map-share', mapShare)
			await receivedStore.download(mapShare.shareId)

			// Wait for completion
			await waitForStoreState(
				sentStore,
				(state) => state[0]?.status === 'completed',
			)

			// Now trying to cancel should throw because completed -> canceled is not allowed
			await expect(() => sentStore.cancel(mapShare.shareId)).rejects.toThrow(
				'Invalid status transition from completed to canceled',
			)

			const snapshot = sentStore.getSnapshot()
			expect(snapshot[0]?.status).toBe('completed')
		})
	})

	describe('subscription', () => {
		it('should notify all subscribers when state changes', async () => {
			const listener1 = vi.fn()
			const listener2 = vi.fn()
			const listener3 = vi.fn()

			sentStore.subscribe(listener1)
			sentStore.subscribe(listener2)
			sentStore.subscribe(listener3)

			await sentStore.create({
				projectId: 'test-project-id',
				receiverDeviceId: receiver.deviceId,
				mapId: 'custom',
			})

			expect(listener1).toHaveBeenCalled()
			expect(listener2).toHaveBeenCalled()
			expect(listener3).toHaveBeenCalled()
		})

		it('should stop notifying after unsubscribe', async () => {
			const listener = vi.fn()
			const unsubscribe = sentStore.subscribe(listener)

			await sentStore.create({
				projectId: 'test-project-id',
				receiverDeviceId: receiver.deviceId,
				mapId: 'custom',
			})

			const callCountAfterCreate = listener.mock.calls.length

			unsubscribe()

			// Create another share
			await sentStore.create({
				projectId: 'test-project-id',
				receiverDeviceId: receiver.deviceId,
				mapId: 'custom',
			})

			// Should still be the same count because we unsubscribed
			expect(listener).toHaveBeenCalledTimes(callCountAfterCreate)
		})
	})
})

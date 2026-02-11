/**
 * @vitest-environment node
 */
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

			await sentStore.actions.createAndSend({
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
			await sentStore.actions.createAndSend({
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
			await sentStore.actions.createAndSend({
				projectId: 'test-project-id',
				receiverDeviceId: receiver.deviceId,
				mapId: 'custom',
			})

			await sentStore.actions.createAndSend({
				projectId: 'test-project-id',
				receiverDeviceId: receiver.deviceId,
				mapId: 'custom',
			})

			const snapshot = sentStore.getSnapshot()
			expect(snapshot).toHaveLength(2)
			expect(snapshot[0]?.shareId).not.toBe(snapshot[1]?.shareId)
		})

		it('should create share on the server', async () => {
			const { shareId } = await sentStore.actions.createAndSend({
				projectId: 'test-project-id',
				receiverDeviceId: receiver.deviceId,
				mapId: 'custom',
			})

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

		it('should cancel the map share on the server if $sendMapShare throws', async () => {
			// Make $sendMapShare throw an error
			const sendError = new Error('Failed to send map share')
			mockClientApi.$sendMapShare.mockRejectedValueOnce(sendError)

			// createAndSend should throw
			await expect(
				sentStore.actions.createAndSend({
					projectId: 'test-project-id',
					receiverDeviceId: receiver.deviceId,
					mapId: 'custom',
				}),
			).rejects.toThrow('Failed to send map share')

			// The store should be empty since createAndSend failed
			expect(sentStore.getSnapshot()).toHaveLength(0)

			// Query the server to find the map share - it should exist and be canceled
			const serverShares = (await sender
				.get('mapShares')
				.json()) as Array<ServerMapShareState>

			expect(serverShares).toHaveLength(1)
			expect(serverShares[0]).toMatchObject({
				mapId: 'custom',
				status: 'canceled',
			})
		})
	})

	describe('cancel', () => {
		it('should update status to canceled immediately', async () => {
			const { shareId } = await sentStore.actions.createAndSend({
				projectId: 'test-project-id',
				receiverDeviceId: receiver.deviceId,
				mapId: 'custom',
			})

			const cancelPromise = sentStore.actions.cancel({ shareId })

			expect(sentStore.getSnapshot()[0]).toHaveProperty('status', 'canceled')

			// Verify the server was called to cancel the share
			await expect(cancelPromise).resolves.toBeUndefined()

			expect(sentStore.getSnapshot()[0]).toHaveProperty('status', 'canceled')
		})

		it('should throw when canceling a non-existent share', async () => {
			await expect(() =>
				sentStore.actions.cancel({ shareId: 'non-existent-share-id' }),
			).rejects.toThrow(
				expect.objectContaining({
					code: 'MAP_SHARE_NOT_FOUND',
				}),
			)
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
			const serverShare = await sentStore.actions.createAndSend({
				projectId: 'test-project-id',
				receiverDeviceId: receiver.deviceId,
				mapId: 'custom',
			})

			// Simulate receiver getting the share (as if via comapeo-core event)
			const mapShare = createMapShareFromServerShare(
				sender.deviceId,
				serverShare,
			)
			receiverMockClientApi.emit('map-share', mapShare)

			// Receiver declines the share
			await receivedStore.actions.decline({
				shareId: mapShare.shareId,
				reason: 'user_rejected',
			})

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
			const serverShare = await sentStore.actions.createAndSend({
				projectId: 'test-project-id',
				receiverDeviceId: receiver.deviceId,
				mapId: 'custom',
			})

			// Simulate receiver getting the share
			const mapShare = createMapShareFromServerShare(
				sender.deviceId,
				serverShare,
			)
			receiverMockClientApi.emit('map-share', mapShare)

			// Receiver downloads the share
			await receivedStore.actions.download({ shareId: mapShare.shareId })

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
			const serverShare = await sentStore.actions.createAndSend({
				projectId: 'test-project-id',
				receiverDeviceId: receiver.deviceId,
				mapId: 'custom',
			})

			// Simulate receiver getting the share
			const mapShare = createMapShareFromServerShare(
				sender.deviceId,
				serverShare,
			)
			receiverMockClientApi.emit('map-share', mapShare)

			// Receiver starts the download
			await receivedStore.actions.download({ shareId: mapShare.shareId })

			// Receiver aborts (if still downloading)
			const receiverSnapshot = receivedStore.getSnapshot()
			expect(receiverSnapshot[0]).toHaveProperty('status', 'downloading')
			await receivedStore.actions.abort({ shareId: mapShare.shareId })

			// Sender's store should see the status update via EventSource
			await waitForStoreState(
				sentStore,
				(state) => state[0]?.status === 'aborted',
			)

			const snapshot = sentStore.getSnapshot()
			expect(snapshot[0]).toHaveProperty('status', 'aborted')
		})

		it('should maintain array reference during download progress updates (Object.is equality)', async () => {
			// Sender creates a share
			const serverShare = await sentStore.actions.createAndSend({
				projectId: 'test-project-id',
				receiverDeviceId: receiver.deviceId,
				mapId: 'custom',
			})

			// Simulate receiver getting the share
			const mapShare = createMapShareFromServerShare(
				sender.deviceId,
				serverShare,
			)
			receiverMockClientApi.emit('map-share', mapShare)

			// Receiver starts the download
			await receivedStore.actions.download({ shareId: mapShare.shareId })

			// Wait for sender to see the downloading status
			await waitForStoreState(
				sentStore,
				(state) => state[0]?.status === 'downloading',
			)

			// Capture the snapshot when downloading starts
			const snapshotDuringDownload = sentStore.getSnapshot()
			expect(snapshotDuringDownload[0]).toHaveProperty('status', 'downloading')

			// Wait for a progress update (bytesDownloaded changes while status stays 'downloading')
			await new Promise<void>((resolve, reject) => {
				const timeout = setTimeout(() => {
					unsubscribe()
					reject(new Error('Timeout waiting for progress update'))
				}, 5000)

				const initialShare = snapshotDuringDownload[0]
				const initialBytesDownloaded =
					initialShare?.status === 'downloading'
						? initialShare.bytesDownloaded
						: 0

				const unsubscribe = sentStore.subscribe(() => {
					const current = sentStore.getSnapshot()
					const currentShare = current[0]
					if (
						currentShare?.status === 'downloading' &&
						currentShare.bytesDownloaded > initialBytesDownloaded
					) {
						clearTimeout(timeout)
						unsubscribe()

						// Array reference should be the same (Object.is equality)
						// This is important for useSyncExternalStore - components
						// listening to the raw array won't re-render on progress updates
						// eslint-disable-next-line vitest/no-conditional-expect -- resolve() is also conditional, so test will fail if condition not met
						expect(current).toBe(snapshotDuringDownload)

						resolve()
					}
				})
			})

			// Wait for download to complete
			await waitForStoreState(
				sentStore,
				(state) => state[0]?.status === 'completed',
			)
		})

		it('should update individual map share reference during download progress updates', async () => {
			// Sender creates a share
			const serverShare = await sentStore.actions.createAndSend({
				projectId: 'test-project-id',
				receiverDeviceId: receiver.deviceId,
				mapId: 'custom',
			})

			// Simulate receiver getting the share
			const mapShare = createMapShareFromServerShare(
				sender.deviceId,
				serverShare,
			)
			receiverMockClientApi.emit('map-share', mapShare)

			// Receiver starts the download
			await receivedStore.actions.download({ shareId: mapShare.shareId })

			// Wait for sender to see the downloading status
			await waitForStoreState(
				sentStore,
				(state) => state[0]?.status === 'downloading',
			)

			// Capture the initial map share reference
			const initialMapShare = sentStore.getSnapshot()[0]
			expect(initialMapShare).toHaveProperty('status', 'downloading')

			// Wait for a progress update
			await new Promise<void>((resolve, reject) => {
				const timeout = setTimeout(() => {
					unsubscribe()
					reject(new Error('Timeout waiting for progress update'))
				}, 5000)

				const initialBytesDownloaded =
					initialMapShare?.status === 'downloading'
						? initialMapShare.bytesDownloaded
						: 0

				const unsubscribe = sentStore.subscribe(() => {
					const currentShare = sentStore.getSnapshot()[0]
					if (
						currentShare?.status === 'downloading' &&
						currentShare.bytesDownloaded > initialBytesDownloaded
					) {
						clearTimeout(timeout)
						unsubscribe()

						// Individual map share should be a different object
						// This means selectors that return individual map shares will
						// correctly trigger re-renders on progress updates
						// eslint-disable-next-line vitest/no-conditional-expect -- resolve() is also conditional, so test will fail if condition not met
						expect(currentShare).not.toBe(initialMapShare)

						resolve()
					}
				})
			})

			// Wait for download to complete
			await waitForStoreState(
				sentStore,
				(state) => state[0]?.status === 'completed',
			)
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
			const serverShare = await sentStore.actions.createAndSend({
				projectId: 'test-project-id',
				receiverDeviceId: receiver.deviceId,
				mapId: 'custom',
			})

			// Simulate receiver getting and declining the share
			const mapShare = createMapShareFromServerShare(
				sender.deviceId,
				serverShare,
			)
			receiverMockClientApi.emit('map-share', mapShare)
			await receivedStore.actions.decline({
				shareId: mapShare.shareId,
				reason: 'user_rejected',
			})

			// Wait for sender to see the decline
			await waitForStoreState(
				sentStore,
				(state) => state[0]?.status === 'declined',
			)

			// Now trying to cancel should throw because declined -> canceled is not allowed
			await expect(() =>
				sentStore.actions.cancel({ shareId: mapShare.shareId }),
			).rejects.toThrow('Invalid status transition from declined to canceled')

			const snapshot = sentStore.getSnapshot()
			expect(snapshot[0]?.status).toBe('declined')
		})

		it('should not allow cancel after completion', async () => {
			const serverShare = await sentStore.actions.createAndSend({
				projectId: 'test-project-id',
				receiverDeviceId: receiver.deviceId,
				mapId: 'custom',
			})

			// Simulate receiver getting and downloading the share
			const mapShare = createMapShareFromServerShare(
				sender.deviceId,
				serverShare,
			)
			receiverMockClientApi.emit('map-share', mapShare)
			await receivedStore.actions.download({ shareId: mapShare.shareId })

			// Wait for completion
			await waitForStoreState(
				sentStore,
				(state) => state[0]?.status === 'completed',
			)

			// Now trying to cancel should throw because completed -> canceled is not allowed
			await expect(() =>
				sentStore.actions.cancel({ shareId: mapShare.shareId }),
			).rejects.toThrow('Invalid status transition from completed to canceled')

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

			await sentStore.actions.createAndSend({
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

			await sentStore.actions.createAndSend({
				projectId: 'test-project-id',
				receiverDeviceId: receiver.deviceId,
				mapId: 'custom',
			})

			const callCountAfterCreate = listener.mock.calls.length

			unsubscribe()

			// Create another share
			await sentStore.actions.createAndSend({
				projectId: 'test-project-id',
				receiverDeviceId: receiver.deviceId,
				mapId: 'custom',
			})

			// Should still be the same count because we unsubscribed
			expect(listener).toHaveBeenCalledTimes(callCountAfterCreate)
		})
	})
})

/**
 * @vitest-environment node
 *
 * We use node environment because:
 * - happy-dom provides its own fetch with CORS restrictions that break real HTTP requests
 * - jsdom has its own Uint8Array that breaks compatibility with native Node modules
 * - Node environment uses native fetch which works with real servers
 * - renderHook from @testing-library/react can work in node with global-jsdom
 */

// Set up minimal DOM globals needed for React rendering in this test file
import '../helpers/jsdom-setup.js'

import { type MapeoClientApi } from '@comapeo/ipc'
import { errors } from '@comapeo/map-server'
import { act, renderHook, waitFor } from '@testing-library/react'
import {
	Suspense,
	useEffect,
	useRef,
	useState,
	type PropsWithChildren,
} from 'react'
import { beforeEach, describe, expect, it } from 'vitest'

import {
	useAbortReceivedMapShareDownload,
	useCancelSentMapShare,
	useDeclineReceivedMapShare,
	useDownloadReceivedMapShare,
	useManyReceivedMapShares,
	useMapStyleUrl,
	useSendMapShare,
	useSingleReceivedMapShare,
	useSingleSentMapShare,
	type SentMapShareState,
} from '../../src/index.js'
import {
	createMockClientApi,
	type MockClientApi,
} from '../helpers/client-api-mock.js'
import { DEMOTILES_Z2, OSM_BRIGHT_Z6 } from '../helpers/constants.js'
import { startMapServer, type ServerInstance } from '../helpers/map-server.js'
import { createWrapper } from '../helpers/react.js'

// ============================================
// HELPERS
// ============================================

/**
 * Creates a share using the sender's hooks and returns the share data.
 * This helper uses a separate render for the sender context.
 */
async function createShareWithHook({
	senderWrapper,
	receiverDeviceId,
}: {
	senderWrapper: ReturnType<typeof createWrapper>
	receiverDeviceId: string
}): Promise<SentMapShareState> {
	const { result } = renderHook(() => useSendMapShare(), {
		wrapper: senderWrapper,
	})

	let createdShare: Awaited<
		ReturnType<typeof result.current.mutateAsync>
	> | null = null

	await act(async () => {
		createdShare = await result.current.mutateAsync({
			projectId: 'test-project-id',
			receiverDeviceId,
			mapId: 'custom',
		})
	})

	if (!createdShare) {
		throw new Error('Failed to create share')
	}

	return createdShare
}

// Create a stateful wrapper that only renders children once a share exists.
// This allows useSingleReceivedMapShare to be tested without throwing.
function WaitForShareWrapper({ children }: PropsWithChildren) {
	const shares = useManyReceivedMapShares()
	return <>{shares.length > 0 ? children : null}</>
}

// ============================================
// RECEIVED MAP SHARES HOOKS
// ============================================

describe('Received Map Shares Hooks', () => {
	let mockClientApi: MockClientApi
	let sender: ServerInstance
	let receiver: ServerInstance
	let receiverWrapper: ReturnType<typeof createWrapper>
	let senderWrapper: ReturnType<typeof createWrapper>

	beforeEach(async (t) => {
		mockClientApi = createMockClientApi()
		sender = await startMapServer(t, { customMapPath: OSM_BRIGHT_Z6 })
		receiver = await startMapServer(t, { customMapPath: DEMOTILES_Z2 })

		// Receiver wrapper - for testing received hooks
		receiverWrapper = createWrapper({
			clientApi: mockClientApi as unknown as MapeoClientApi,
			getMapServerBaseUrl: async () => new URL(receiver.localBaseUrl),
		})

		// Sender wrapper - for creating shares via hooks
		senderWrapper = createWrapper({
			getMapServerBaseUrl: async () => new URL(sender.localBaseUrl),
		})
	})

	// Helper to create shares and convert to MapShare format for receiver
	const createShare = async () => {
		const serverShare = await createShareWithHook({
			senderWrapper,
			receiverDeviceId: receiver.deviceId,
		})
		// Convert to MapShare format (what receiver gets via 'map-share' event)
		return {
			...serverShare,
			mapShareReceivedAt: Date.now(),
			senderDeviceId: sender.deviceId,
			senderDeviceName: 'Test Sender',
		}
	}

	describe('useManyReceivedMapShares', () => {
		it('should return empty array initially', () => {
			const { result } = renderHook(() => useManyReceivedMapShares(), {
				wrapper: receiverWrapper,
			})

			expect(result.current).toEqual([])
		})

		it('should return all received map shares when shares are added', async () => {
			const { result } = renderHook(() => useManyReceivedMapShares(), {
				wrapper: receiverWrapper,
			})

			const mapShare = await createShare()

			act(() => {
				mockClientApi.emit('map-share', mapShare)
			})

			await waitFor(() => {
				expect(result.current).toHaveLength(1)
			})

			expect(result.current[0]).toMatchObject({
				shareId: mapShare.shareId,
				senderDeviceId: sender.deviceId,
				status: 'pending',
			})
		})

		it('should update when multiple map shares are received', async () => {
			const { result } = renderHook(() => useManyReceivedMapShares(), {
				wrapper: receiverWrapper,
			})

			const mapShare1 = await createShare()
			const mapShare2 = await createShare()

			act(() => {
				mockClientApi.emit('map-share', mapShare1)
				mockClientApi.emit('map-share', mapShare2)
			})

			await waitFor(() => {
				expect(result.current).toHaveLength(2)
			})
		})
	})

	describe('useSingleReceivedMapShare', () => {
		it('should throw when shareId is not found', () => {
			expect(() => {
				renderHook(
					() => useSingleReceivedMapShare({ shareId: 'non-existent' }),
					{ wrapper: receiverWrapper },
				)
			}).toThrow('Map share with id non-existent not found')
		})

		it('should return the specific map share', async () => {
			const mapShare = await createShare()

			// Combine the base wrapper with our stateful wrapper
			function CombinedWrapper({ children }: PropsWithChildren) {
				const BaseWrapper = receiverWrapper
				return (
					<BaseWrapper>
						<WaitForShareWrapper>{children}</WaitForShareWrapper>
					</BaseWrapper>
				)
			}

			// Render the hook - it won't run until share is available
			const { result } = renderHook(
				() => useSingleReceivedMapShare({ shareId: mapShare.shareId }),
				{ wrapper: CombinedWrapper },
			)

			// Emit the share event to trigger the store update
			act(() => {
				mockClientApi.emit('map-share', mapShare)
			})

			// Wait for the hook to render with data
			await waitFor(() => {
				expect(result.current).toBeDefined()
			})

			// Now verify useSingleReceivedMapShare returns the correct share
			expect(result.current.shareId).toBe(mapShare.shareId)
			expect(result.current.status).toBe('pending')
			expect(result.current.senderDeviceId).toBe(sender.deviceId)
		})
	})

	describe('useDownloadReceivedMapShare', () => {
		it('should show download progress during download', async () => {
			// Capture all render states to verify progress updates
			const capturedStates: Array<{
				status: string
				bytesDownloaded?: number
			}> = []

			function Tracker() {
				const share = useSingleReceivedMapShare({ shareId: mapShare.shareId })
				capturedStates.push({
					status: share.status,
					// @ts-expect-error no need to type this precisely for the test
					bytesDownloaded: share.bytesDownloaded,
				})
				return null
			}

			function CombinedWrapper({ children }: PropsWithChildren) {
				const BaseWrapper = receiverWrapper

				return (
					<BaseWrapper>
						<WaitForShareWrapper>
							<Tracker />
							{children}
						</WaitForShareWrapper>
					</BaseWrapper>
				)
			}

			// Create the share before we render, so we have the shareId for the wrappers
			const mapShare = await createShare()

			const { result } = renderHook(
				() => ({
					download: useDownloadReceivedMapShare(),
					shares: useManyReceivedMapShares(),
				}),
				{ wrapper: CombinedWrapper },
			)

			// Emit the share AFTER the store is listening
			act(() => {
				mockClientApi.emit('map-share', mapShare)
			})

			// Wait for share to appear in store
			await waitFor(() => {
				expect(result.current.shares).toHaveLength(1)
			})

			// Now trigger the download
			act(() => {
				result.current.download.mutate({ shareId: mapShare.shareId })
			})

			await waitFor(() => {
				expect(result.current.download.status).toBe('success')
			})

			// Wait for download to complete
			await waitFor(() => {
				expect(result.current.shares[0]?.status).toBe('completed')
			})

			// Verify we saw downloading states with progress before completion
			const downloadingStates = capturedStates.filter(
				(s) => s.status === 'downloading' && s.bytesDownloaded! > 0,
			)
			expect(downloadingStates.length).toBeGreaterThan(7)
		})

		it('should not re-render useManyReceivedMapShares during download progress updates', async () => {
			// Track renders of useManyReceivedMapShares to verify it only re-renders
			// on status changes, not on download progress updates
			const capturedStates: Array<{
				status: string
				bytesDownloaded?: number
			}> = []

			function ManySharesTracker() {
				const shares = useManyReceivedMapShares()
				const share = shares.find((s) => s.shareId === mapShare.shareId)
				if (share) {
					capturedStates.push({
						status: share.status,
						// @ts-expect-error no need to type this precisely for the test
						bytesDownloaded: share.bytesDownloaded,
					})
				}
				return null
			}

			function CombinedWrapper({ children }: PropsWithChildren) {
				const BaseWrapper = receiverWrapper

				return (
					<BaseWrapper>
						<ManySharesTracker />
						{children}
					</BaseWrapper>
				)
			}

			// Create the share before we render, so we have the shareId for the wrappers
			const mapShare = await createShare()

			const { result } = renderHook(
				() => ({
					download: useDownloadReceivedMapShare(),
					shares: useManyReceivedMapShares(),
				}),
				{ wrapper: CombinedWrapper },
			)

			// Emit the share AFTER the store is listening
			act(() => {
				mockClientApi.emit('map-share', mapShare)
			})

			// Wait for share to appear in store
			await waitFor(() => {
				expect(result.current.shares).toHaveLength(1)
			})

			// Now trigger the download
			act(() => {
				result.current.download.mutate({ shareId: mapShare.shareId })
			})

			await waitFor(() => {
				expect(result.current.download.status).toBe('success')
			})

			// Wait for download to complete
			await waitFor(() => {
				expect(result.current.shares[0]?.status).toBe('completed')
			})

			// Get unique statuses captured (ignoring bytesDownloaded changes)
			const uniqueStatuses = [...new Set(capturedStates.map((s) => s.status))]

			// Should have seen: pending, downloading, completed
			expect(uniqueStatuses).toContain('pending')
			expect(uniqueStatuses).toContain('downloading')
			expect(uniqueStatuses).toContain('completed')

			// The key assertion: useManyReceivedMapShares should NOT re-render
			// during download progress updates. It should only re-render on status
			// changes. So we should see at most a few renders per status, not many
			// renders with different bytesDownloaded values.
			const downloadingStates = capturedStates.filter(
				(s) => s.status === 'downloading',
			)
			const uniqueBytesDownloaded = [
				...new Set(downloadingStates.map((s) => s.bytesDownloaded)),
			]

			// With the optimization working, we should only see one unique
			// bytesDownloaded value during downloading (the initial value when status
			// changes to downloading), not many different values as progress updates
			// come in.
			expect(uniqueBytesDownloaded.length).toBe(1)
			expect(uniqueBytesDownloaded[0]).toBe(0) // should be the initial value when status changes to downloading
		})

		it('should invalidate map style URL query after download completes', async () => {
			function CombinedWrapper({ children }: PropsWithChildren) {
				const BaseWrapper = receiverWrapper
				return (
					<BaseWrapper>
						<Suspense fallback={null}>{children}</Suspense>
					</BaseWrapper>
				)
			}

			const mapShare = await createShare()

			const { result } = renderHook(
				() => ({
					styleUrl: useMapStyleUrl(),
					download: useDownloadReceivedMapShare(),
					shares: useManyReceivedMapShares(),
				}),
				{ wrapper: CombinedWrapper },
			)

			await waitFor(() => {
				expect(result.current.styleUrl.data).toBeDefined()
			})

			const urlBefore = result.current.styleUrl.data

			// Emit the share AFTER the store is listening
			act(() => {
				mockClientApi.emit('map-share', mapShare)
			})

			await waitFor(() => {
				expect(result.current.shares).toHaveLength(1)
			})

			// Trigger the download
			act(() => {
				result.current.download.mutate({ shareId: mapShare.shareId })
			})

			await waitFor(() => {
				expect(result.current.download.status).toBe('success')
			})

			// Wait for download to complete
			await waitFor(() => {
				expect(result.current.shares[0]?.status).toBe('completed')
			})

			// After download completes, the map style URL query should be
			// invalidated and refetched, resulting in a new refresh_token
			await waitFor(() => {
				expect(result.current.styleUrl.data).not.toBe(urlBefore)
			})

			const urlAfter = result.current.styleUrl.data
			expect(urlAfter).not.toBe(urlBefore)
		})

		it('should throw for non-existent shareId', async () => {
			const { result } = renderHook(() => useDownloadReceivedMapShare(), {
				wrapper: receiverWrapper,
			})

			act(() => {
				result.current.mutate({ shareId: 'non-existent' })
			})

			await waitFor(() => {
				expect(result.current.status).toBe('error')
			})

			expect(result.current.error).toHaveProperty('code', 'MAP_SHARE_NOT_FOUND')
		})

		it('should update status to error when download fails', async () => {
			const { result } = renderHook(
				() => ({
					download: useDownloadReceivedMapShare(),
					shares: useManyReceivedMapShares(),
				}),
				{ wrapper: receiverWrapper },
			)

			// Create a share with invalid URLs to cause a download error
			const mapShare = await createShare()
			const invalidShare = {
				...mapShare,
				mapShareUrls: ['http://127.0.0.1:80/invalid'] as const,
			}

			act(() => {
				mockClientApi.emit('map-share', invalidShare)
			})

			await waitFor(() => {
				expect(result.current.shares).toHaveLength(1)
			})

			// Start the download - the mutation itself succeeds, but the
			// download fails asynchronously and the status updates to 'error'
			act(() => {
				result.current.download.mutate({ shareId: mapShare.shareId })
			})

			await waitFor(() => {
				expect(result.current.shares[0]?.status).toBe('error')
			})

			expect(result.current.shares[0]).toHaveProperty(
				'error.code',
				'DOWNLOAD_ERROR',
			)
		})
	})

	describe('useDeclineReceivedMapShare', () => {
		it('should have idle status initially', () => {
			const { result } = renderHook(() => useDeclineReceivedMapShare(), {
				wrapper: receiverWrapper,
			})

			expect(result.current.status).toBe('idle')
		})

		it('should throw for non-existent shareId', async () => {
			const { result } = renderHook(() => useDeclineReceivedMapShare(), {
				wrapper: receiverWrapper,
			})

			act(() => {
				result.current.mutate({
					shareId: 'non-existent',
					reason: 'user_rejected',
				})
			})

			await waitFor(() => {
				expect(result.current.status).toBe('error')
			})

			expect(result.current.error).toHaveProperty('code', 'MAP_SHARE_NOT_FOUND')
		})

		it('should decline a pending share', async () => {
			// First render the hook to set up the store
			const { result } = renderHook(
				() => ({
					decline: useDeclineReceivedMapShare(),
					shares: useManyReceivedMapShares(),
				}),
				{ wrapper: receiverWrapper },
			)

			// Create and emit the share AFTER the store is listening
			const mapShare = await createShare()
			act(() => {
				mockClientApi.emit('map-share', mapShare)
			})

			// Wait for share to appear in store
			await waitFor(() => {
				expect(result.current.shares).toHaveLength(1)
			})

			// Now decline the share
			act(() => {
				result.current.decline.mutate({
					shareId: mapShare.shareId,
					reason: 'user_rejected',
				})
			})

			await waitFor(() => {
				expect(result.current.decline.status).toBe('success')
			})

			expect(result.current.shares[0]).toHaveProperty('status', 'declined')
			expect(result.current.shares[0]).toHaveProperty('reason', 'user_rejected')
		})
	})

	describe('useAbortReceivedMapShareDownload', () => {
		it('should have idle status initially', () => {
			const { result } = renderHook(() => useAbortReceivedMapShareDownload(), {
				wrapper: receiverWrapper,
			})

			expect(result.current.status).toBe('idle')
		})

		it('should throw for non-existent shareId', async () => {
			const { result } = renderHook(() => useAbortReceivedMapShareDownload(), {
				wrapper: receiverWrapper,
			})

			act(() => {
				result.current.mutate({ shareId: 'non-existent' })
			})

			await waitFor(() => {
				expect(result.current.status).toBe('error')
			})

			expect(result.current.error).toHaveProperty('code', 'MAP_SHARE_NOT_FOUND')
		})

		it('should abort an in-progress download', async () => {
			// First render the hook to set up the store
			const { result } = renderHook(
				() => ({
					download: useDownloadReceivedMapShare(),
					abort: useAbortReceivedMapShareDownload(),
					shares: useManyReceivedMapShares(),
				}),
				{ wrapper: receiverWrapper },
			)

			// Create and emit the share AFTER the store is listening
			const mapShare = await createShare()
			act(() => {
				mockClientApi.emit('map-share', mapShare)
			})

			// Wait for share to appear in store
			await waitFor(() => {
				expect(result.current.shares).toHaveLength(1)
			})

			// Start download and immediately abort to minimize race condition
			await act(async () => {
				result.current.download.mutate({ shareId: mapShare.shareId })
				// Small delay to let the store update to 'downloading'
				await new Promise((resolve) => setTimeout(resolve, 10))
				result.current.abort.mutate({ shareId: mapShare.shareId })
			})

			await waitFor(() => {
				expect(result.current.abort.status).toBe('success')
			})

			expect(result.current.shares[0]).toHaveProperty('status', 'aborted')
		})

		it('should throw for invalid status transition (pending -> aborted)', async () => {
			// First render the hook to set up the store
			const { result } = renderHook(
				() => ({
					abort: useAbortReceivedMapShareDownload(),
					shares: useManyReceivedMapShares(),
				}),
				{ wrapper: receiverWrapper },
			)

			// Create and emit the share AFTER the store is listening
			const mapShare = await createShare()
			act(() => {
				mockClientApi.emit('map-share', mapShare)
			})

			// Wait for share to appear in store
			await waitFor(() => {
				expect(result.current.shares).toHaveLength(1)
			})

			// Try to abort without downloading first (pending -> aborted is invalid)
			act(() => {
				result.current.abort.mutate({ shareId: mapShare.shareId })
			})

			await waitFor(() => {
				expect(result.current.abort.status).toBe('error')
			})

			expect(result.current.abort.error?.message).toContain(
				'Invalid status transition',
			)
			expect(result.current.abort.error).toHaveProperty(
				'code',
				'INVALID_STATUS_TRANSITION',
			)
		})
	})

	describe('invalid status transitions', () => {
		it('should not allow download after decline', async () => {
			const { result } = renderHook(
				() => ({
					download: useDownloadReceivedMapShare(),
					decline: useDeclineReceivedMapShare(),
					shares: useManyReceivedMapShares(),
				}),
				{ wrapper: receiverWrapper },
			)

			const mapShare = await createShare()
			act(() => {
				mockClientApi.emit('map-share', mapShare)
			})

			await waitFor(() => {
				expect(result.current.shares).toHaveLength(1)
			})

			// Decline the share first
			act(() => {
				result.current.decline.mutate({
					shareId: mapShare.shareId,
					reason: 'user_rejected',
				})
			})

			await waitFor(() => {
				expect(result.current.decline.status).toBe('success')
			})

			expect(result.current.shares[0]).toHaveProperty('status', 'declined')

			// Now try to download - should fail
			act(() => {
				result.current.download.mutate({ shareId: mapShare.shareId })
			})

			await waitFor(() => {
				expect(result.current.download.status).toBe('error')
			})

			expect(result.current.download.error?.message).toContain(
				'Invalid status transition',
			)
		})

		it('should not allow decline after download starts', async () => {
			const { result } = renderHook(
				() => ({
					download: useDownloadReceivedMapShare(),
					decline: useDeclineReceivedMapShare(),
					shares: useManyReceivedMapShares(),
				}),
				{ wrapper: receiverWrapper },
			)

			const mapShare = await createShare()
			act(() => {
				mockClientApi.emit('map-share', mapShare)
			})

			await waitFor(() => {
				expect(result.current.shares).toHaveLength(1)
			})

			// Start download and immediately try to decline to minimize race condition
			await act(async () => {
				result.current.download.mutate({ shareId: mapShare.shareId })
				// Small delay to let the store update to 'downloading'
				await new Promise((resolve) => setTimeout(resolve, 10))
				result.current.decline.mutate({
					shareId: mapShare.shareId,
					reason: 'user_rejected',
				})
			})

			await waitFor(() => {
				expect(result.current.decline.status).toBe('error')
			})

			expect(result.current.decline.error?.message).toContain(
				'Invalid status transition',
			)
		})

		it('should not allow any action after completion', async () => {
			const { result } = renderHook(
				() => ({
					download: useDownloadReceivedMapShare(),
					decline: useDeclineReceivedMapShare(),
					abort: useAbortReceivedMapShareDownload(),
					shares: useManyReceivedMapShares(),
				}),
				{ wrapper: receiverWrapper },
			)

			const mapShare = await createShare()
			act(() => {
				mockClientApi.emit('map-share', mapShare)
			})

			await waitFor(() => {
				expect(result.current.shares).toHaveLength(1)
			})

			// Download and wait for completion
			act(() => {
				result.current.download.mutate({ shareId: mapShare.shareId })
			})

			await waitFor(() => {
				expect(result.current.shares[0]?.status).toBe('completed')
			})

			// Reset the download mutation to test again
			act(() => {
				result.current.download.reset()
			})

			// Try to download again - should fail
			act(() => {
				result.current.download.mutate({ shareId: mapShare.shareId })
			})

			await waitFor(() => {
				expect(result.current.download.status).toBe('error')
			})

			expect(result.current.download.error?.message).toContain(
				'Invalid status transition',
			)

			// Try to decline - should fail
			act(() => {
				result.current.decline.mutate({
					shareId: mapShare.shareId,
					reason: 'user_rejected',
				})
			})

			await waitFor(() => {
				expect(result.current.decline.status).toBe('error')
			})

			expect(result.current.decline.error?.message).toContain(
				'Invalid status transition',
			)

			// Try to abort - should fail
			act(() => {
				result.current.abort.mutate({ shareId: mapShare.shareId })
			})

			await waitFor(() => {
				expect(result.current.abort.status).toBe('error')
			})

			expect(result.current.abort.error?.message).toContain(
				'Invalid status transition',
			)
		})
	})

	describe('sender cancels before receiver acts', () => {
		const cancelOnSender = async (shareId: string) => {
			const url = new URL(`mapShares/${shareId}/cancel`, sender.localBaseUrl)
			const response = await fetch(url, { method: 'POST' })
			if (!response.ok) {
				throw new Error(`Failed to cancel share: ${response.status}`)
			}
		}

		it('should end at canceled status when downloading after sender canceled', async () => {
			const { result } = renderHook(
				() => ({
					download: useDownloadReceivedMapShare(),
					shares: useManyReceivedMapShares(),
				}),
				{ wrapper: receiverWrapper },
			)

			const mapShare = await createShare()
			await cancelOnSender(mapShare.shareId)

			act(() => {
				mockClientApi.emit('map-share', mapShare)
			})

			await waitFor(() => {
				expect(result.current.shares).toHaveLength(1)
			})

			act(() => {
				result.current.download.mutate({ shareId: mapShare.shareId })
			})

			await waitFor(() => {
				expect(result.current.download.status).toBe('success')
			})

			await waitFor(() => {
				expect(result.current.shares[0]?.status).toBe('canceled')
			})
		})

		it('should throw MAP_SHARE_CANCELED when declining after sender canceled', async () => {
			const { result } = renderHook(
				() => ({
					decline: useDeclineReceivedMapShare(),
					shares: useManyReceivedMapShares(),
				}),
				{ wrapper: receiverWrapper },
			)

			const mapShare = await createShare()
			await cancelOnSender(mapShare.shareId)

			act(() => {
				mockClientApi.emit('map-share', mapShare)
			})

			await waitFor(() => {
				expect(result.current.shares).toHaveLength(1)
			})

			act(() => {
				result.current.decline.mutate({
					shareId: mapShare.shareId,
					reason: 'user_rejected',
				})
			})

			await waitFor(() => {
				expect(result.current.decline.status).toBe('error')
			})

			expect(result.current.decline.error).toHaveProperty(
				'code',
				'MAP_SHARE_CANCELED',
			)
			expect(result.current.shares[0]).toHaveProperty('status', 'canceled')
		})

		it('should not allow any action after share reaches canceled status', async () => {
			const { result } = renderHook(
				() => ({
					download: useDownloadReceivedMapShare(),
					decline: useDeclineReceivedMapShare(),
					abort: useAbortReceivedMapShareDownload(),
					shares: useManyReceivedMapShares(),
				}),
				{ wrapper: receiverWrapper },
			)

			const mapShare = await createShare()
			await cancelOnSender(mapShare.shareId)

			act(() => {
				mockClientApi.emit('map-share', mapShare)
			})

			await waitFor(() => {
				expect(result.current.shares).toHaveLength(1)
			})

			// Download to discover cancellation - share will end at 'canceled'
			act(() => {
				result.current.download.mutate({ shareId: mapShare.shareId })
			})

			await waitFor(() => {
				expect(result.current.shares[0]?.status).toBe('canceled')
			})

			// Reset the download mutation to test again
			act(() => {
				result.current.download.reset()
			})

			// Try to download again - should fail with MAP_SHARE_CANCELED
			act(() => {
				result.current.download.mutate({ shareId: mapShare.shareId })
			})

			await waitFor(() => {
				expect(result.current.download.status).toBe('error')
			})

			expect(result.current.download.error).toHaveProperty(
				'code',
				'MAP_SHARE_CANCELED',
			)

			// Try to decline - should fail with MAP_SHARE_CANCELED
			act(() => {
				result.current.decline.mutate({
					shareId: mapShare.shareId,
					reason: 'user_rejected',
				})
			})

			await waitFor(() => {
				expect(result.current.decline.status).toBe('error')
			})

			expect(result.current.decline.error).toHaveProperty(
				'code',
				'MAP_SHARE_CANCELED',
			)

			// Try to abort - should fail with MAP_SHARE_CANCELED
			act(() => {
				result.current.abort.mutate({ shareId: mapShare.shareId })
			})

			await waitFor(() => {
				expect(result.current.abort.status).toBe('error')
			})

			expect(result.current.abort.error).toHaveProperty(
				'code',
				'MAP_SHARE_CANCELED',
			)
		})
	})
})

// ============================================
// SENT MAP SHARES HOOKS
// ============================================

describe('Sent Map Shares Hooks', () => {
	let mockClientApi: MockClientApi
	let sender: ServerInstance
	let receiver: ServerInstance
	let wrapper: ReturnType<typeof createWrapper>

	beforeEach(async (t) => {
		mockClientApi = createMockClientApi()
		sender = await startMapServer(t, { customMapPath: OSM_BRIGHT_Z6 })
		receiver = await startMapServer(t, { customMapPath: DEMOTILES_Z2 })

		// For sent hooks, we use the sender's map server
		wrapper = createWrapper({
			clientApi: mockClientApi as unknown as MapeoClientApi,
			getMapServerBaseUrl: async () => new URL(sender.localBaseUrl),
		})
	})

	describe('useSendMapShare', () => {
		it('should have idle status initially', () => {
			const { result } = renderHook(() => useSendMapShare(), { wrapper })

			expect(result.current.status).toBe('idle')
		})

		it('should create and send a map share', async () => {
			const { result } = renderHook(() => useSendMapShare(), { wrapper })

			let createdShare: Awaited<
				ReturnType<typeof result.current.mutateAsync>
			> | null = null

			await act(async () => {
				createdShare = await result.current.mutateAsync({
					projectId: 'test-project-id',
					receiverDeviceId: receiver.deviceId,
					mapId: 'custom',
				})
			})

			// Wait for mutation status to update
			await waitFor(() => {
				expect(result.current.status).toBe('success')
			})

			expect(createdShare).toMatchObject({
				mapId: 'custom',
				status: 'pending',
			})
			expect(createdShare).toHaveProperty('shareId')
		})

		it('should call clientApi.getProject and $sendMapShare', async () => {
			const { result } = renderHook(() => useSendMapShare(), { wrapper })

			act(() => {
				result.current.mutate({
					projectId: 'test-project-id',
					receiverDeviceId: receiver.deviceId,
					mapId: 'custom',
				})
			})

			await waitFor(() => {
				expect(result.current.status).toBe('success')
			})

			expect(mockClientApi.getProject).toHaveBeenCalledWith('test-project-id')
			expect(mockClientApi.$sendMapShare).toHaveBeenCalled()
		})
	})

	describe('useCancelSentMapShare', () => {
		it('should have idle status initially', () => {
			const { result } = renderHook(() => useCancelSentMapShare(), { wrapper })

			expect(result.current.status).toBe('idle')
		})

		it('should cancel a pending sent share', async () => {
			const { result } = renderHook(
				() => ({
					send: useSendMapShare(),
					cancel: useCancelSentMapShare(),
				}),
				{ wrapper },
			)

			let createdShare: Awaited<
				ReturnType<typeof result.current.send.mutateAsync>
			> | null = null

			// First create a share
			await act(async () => {
				createdShare = await result.current.send.mutateAsync({
					projectId: 'test-project-id',
					receiverDeviceId: receiver.deviceId,
					mapId: 'custom',
				})
			})

			// Wait for send to complete
			await waitFor(() => {
				expect(result.current.send.status).toBe('success')
			})

			// Now cancel
			act(() => {
				result.current.cancel.mutate({ shareId: createdShare!.shareId })
			})

			await waitFor(() => {
				expect(result.current.cancel.status).toBe('success')
			})
		})

		it('should throw for non-existent shareId', async () => {
			const { result } = renderHook(() => useCancelSentMapShare(), { wrapper })

			act(() => {
				result.current.mutate({ shareId: 'non-existent' })
			})

			await waitFor(() => {
				expect(result.current.status).toBe('error')
			})

			expect(result.current.error).toHaveProperty('code', 'MAP_SHARE_NOT_FOUND')
		})
	})

	describe('useSingleSentMapShare', () => {
		it('should throw MAP_SHARE_NOT_FOUND error when shareId is not found', () => {
			let caughtError: unknown

			try {
				renderHook(() => useSingleSentMapShare({ shareId: 'non-existent' }), {
					wrapper,
				})
			} catch (e) {
				caughtError = e
			}

			expect(caughtError).toBeInstanceOf(errors.MAP_SHARE_NOT_FOUND)
		})

		it('should return the specific sent map share', async () => {
			// Track shareId from wrapper to use in hook and assertions
			let wrapperShareId: string | null = null

			// Stateful wrapper that creates a share and only renders children
			// once the share exists in the store
			function WaitForShareWrapper({ children }: PropsWithChildren) {
				const send = useSendMapShare()
				const [localShareId, setLocalShareId] = useState<string | null>(null)
				const mutationStarted = useRef(false)

				// Use useEffect to trigger mutation on mount (only once)
				useEffect(() => {
					if (send.status === 'idle' && !mutationStarted.current) {
						mutationStarted.current = true
						send
							.mutateAsync({
								projectId: 'test-project-id',
								receiverDeviceId: receiver.deviceId,
								mapId: 'custom',
							})
							// mutateAsync returns Promise<Promise<MapShareState>> because the action returns a Promise
							.then(async (sharePromise) => {
								const share = await sharePromise
								wrapperShareId = share.shareId
								setLocalShareId(share.shareId)
							})
					}
				}, [send])

				return <>{localShareId ? children : null}</>
			}

			function CombinedWrapper({ children }: PropsWithChildren) {
				const BaseWrapper = wrapper
				return (
					<BaseWrapper>
						<WaitForShareWrapper>{children}</WaitForShareWrapper>
					</BaseWrapper>
				)
			}

			const { result } = renderHook(
				() => {
					// wrapperShareId is set before children render
					return useSingleSentMapShare({ shareId: wrapperShareId! })
				},
				{ wrapper: CombinedWrapper },
			)

			// Wait for the hook to render with data (increase timeout for async mutation)
			await waitFor(
				() => {
					expect(result.current).not.toBeNull()
				},
				{ timeout: 10000, interval: 100 },
			)

			// Verify useSingleSentMapShare returns the correct share
			expect(result.current.shareId).toBe(wrapperShareId)
			expect(result.current.status).toBe('pending')
			expect(result.current.mapId).toBe('custom')
		})
	})
})

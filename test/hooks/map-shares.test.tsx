/**
 * @vitest-environment node
 *
 * We use node environment because:
 * - happy-dom provides its own fetch with CORS restrictions that break real HTTP requests
 * - jsdom has its own Uint8Array that breaks compatibility with native Node modules
 * - Node environment uses native fetch which works with real servers
 * - renderHook from @testing-library/react can work in node with global-jsdom
 */
import type { MapeoClientApi } from '@comapeo/ipc'
import { errors } from '@comapeo/map-server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { JSDOM } from 'jsdom'
import { useEffect, useRef, useState, type PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'

import {
	ClientApiProvider,
	MapServerProvider,
	useAbortReceivedMapShareDownload,
	useCancelSentMapShare,
	useDeclineReceivedMapShare,
	useDownloadReceivedMapShare,
	useManyReceivedMapShares,
	useSendMapShare,
	useSingleReceivedMapShare,
	useSingleSentMapShare,
	type SentMapShareState,
} from '../../src/index.js'
import {
	createMockClientApi,
	startTestServers,
	type MockClientApi,
	type ServerInstance,
} from '../lib/map-shares-test-utils.js'

// Set up minimal DOM globals needed for React
const dom = new JSDOM('<!doctype html><html><body></body></html>', {
	url: 'http://localhost',
	pretendToBeVisual: true,
})
globalThis.document = dom.window.document
globalThis.window = dom.window as unknown as Window & typeof globalThis
// navigator is a getter-only property in newer Node.js versions, so use defineProperty
Object.defineProperty(globalThis, 'navigator', {
	value: dom.window.navigator,
	writable: true,
	configurable: true,
})

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
	senderWrapper: ReturnType<typeof createMapSharesWrapper>
	receiverDeviceId: string
}): Promise<SentMapShareState> {
	const { result } = renderHook(
		() => useSendMapShare({ projectId: 'test-project-id' }),
		{ wrapper: senderWrapper },
	)

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

// ============================================
// TEST WRAPPER
// ============================================

function createMapSharesWrapper({
	mockClientApi,
	getBaseUrl,
	queryClient,
}: {
	mockClientApi: MockClientApi
	getBaseUrl: () => Promise<URL>
	queryClient?: QueryClient
}) {
	const qc =
		queryClient ??
		new QueryClient({
			defaultOptions: {
				queries: { retry: false },
				mutations: { retry: false },
			},
		})

	return function Wrapper({ children }: PropsWithChildren) {
		return (
			<QueryClientProvider client={qc}>
				<ClientApiProvider
					clientApi={mockClientApi as unknown as MapeoClientApi}
				>
					<MapServerProvider getBaseUrl={getBaseUrl}>
						{children}
					</MapServerProvider>
				</ClientApiProvider>
			</QueryClientProvider>
		)
	}
}

// ============================================
// RECEIVED MAP SHARES HOOKS
// ============================================

describe('Received Map Shares Hooks', () => {
	let mockClientApi: MockClientApi
	let sender: ServerInstance
	let receiver: ServerInstance
	let receiverWrapper: ReturnType<typeof createMapSharesWrapper>
	let senderWrapper: ReturnType<typeof createMapSharesWrapper>

	beforeEach(async (t) => {
		mockClientApi = createMockClientApi()
		const servers = await startTestServers(t)
		sender = servers.sender
		receiver = servers.receiver

		// Receiver wrapper - for testing received hooks
		receiverWrapper = createMapSharesWrapper({
			mockClientApi,
			getBaseUrl: async () => new URL(receiver.localBaseUrl),
		})

		// Sender wrapper - for creating shares via hooks
		senderWrapper = createMapSharesWrapper({
			mockClientApi: createMockClientApi(), // separate mock for sender
			getBaseUrl: async () => new URL(sender.localBaseUrl),
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

			// Create a stateful wrapper that only renders children once a share exists.
			// This allows useSingleReceivedMapShare to be tested without throwing.
			function WaitForShareWrapper({ children }: PropsWithChildren) {
				const shares = useManyReceivedMapShares()
				const [ready, setReady] = useState(false)

				// Once we have shares, mark as ready (one-way transition)
				if (shares.length > 0 && !ready) {
					setReady(true)
				}

				return <>{ready ? children : null}</>
			}

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
		it('should have idle status initially', () => {
			const { result } = renderHook(() => useDownloadReceivedMapShare(), {
				wrapper: receiverWrapper,
			})

			expect(result.current.status).toBe('idle')
		})

		it('should download a received share and update status to completed', async () => {
			// First render the hook to set up the store
			const { result } = renderHook(
				() => ({
					download: useDownloadReceivedMapShare(),
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

			expect(result.current.error?.message).toContain('not found')
		})
	})

	describe('useDeclineReceivedMapShare', () => {
		it('should have idle status initially', () => {
			const { result } = renderHook(() => useDeclineReceivedMapShare(), {
				wrapper: receiverWrapper,
			})

			expect(result.current.status).toBe('idle')
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
	let wrapper: ReturnType<typeof createMapSharesWrapper>

	beforeEach(async (t) => {
		mockClientApi = createMockClientApi()
		const servers = await startTestServers(t)
		sender = servers.sender
		receiver = servers.receiver

		// For sent hooks, we use the sender's map server
		wrapper = createMapSharesWrapper({
			mockClientApi,
			getBaseUrl: async () => new URL(sender.localBaseUrl),
		})
	})

	describe('useSendMapShare', () => {
		it('should have idle status initially', () => {
			const { result } = renderHook(
				() => useSendMapShare({ projectId: 'test-project-id' }),
				{ wrapper },
			)

			expect(result.current.status).toBe('idle')
		})

		it('should create and send a map share', async () => {
			const { result } = renderHook(
				() => useSendMapShare({ projectId: 'test-project-id' }),
				{ wrapper },
			)

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
			const { result } = renderHook(
				() => useSendMapShare({ projectId: 'test-project-id' }),
				{ wrapper },
			)

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
					send: useSendMapShare({ projectId: 'test-project-id' }),
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
				const send = useSendMapShare({ projectId: 'test-project-id' })
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

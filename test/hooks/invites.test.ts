// @vitest-environment node
import '../helpers/jsdom-setup.js'

import type { InviteApi, InviteLinkJoiner } from '@comapeo/core'
import {
	getErrorCode,
	InviteDeniedByInviterError,
	NotFoundError,
} from '@comapeo/core/errors.js'
import { parseInviteURL } from '@comapeo/core/invite-urls.js'
import { QueryClient } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import createTestnet from 'hyperdht/testnet.js'
import { pEvent, type TypedEventEmitter } from 'p-event'
import { assert, test } from 'vitest'

import {
	useAcceptInvite,
	useAcceptInviteLinkRequest,
	useCancelInviteLink,
	useCancelJoinRequest,
	useCreateInviteLink,
	useCreateJoinRequest,
	useDenyInviteLinkRequest,
	useLeaveProject,
	useManyInviteLinks,
	useManyJoinRequests,
	useManyMembers,
	useProjectSettings,
	useSingleJoinRequest,
	useSingleProject,
} from '../../src/index.js'
import { setupCoreIpc } from '../helpers/ipc.js'
import { createWrapper } from '../helpers/react.js'

const MEMBER_ROLE_ID = '012fd2d431c0bf60'
const BLOCKED_ROLE_ID = '9e6d29263cba36c9'

type Managers = Array<ReturnType<typeof setupCoreIpc>['manager']>

function connectPeers(managers: Managers) {
	let requestedDisconnect = false
	for (const manager of managers) {
		manager.startLocalPeerDiscoveryServer().then(({ name, port }) => {
			if (requestedDisconnect) return
			for (const otherManager of managers) {
				if (otherManager === manager) continue
				otherManager.connectLocalPeer({ address: '127.0.0.1', name, port })
			}
		})
	}
	return async () => {
		requestedDisconnect = true
		await Promise.all(
			managers.map((manager) =>
				manager.stopLocalPeerDiscoveryServer({ force: true }),
			),
		)
	}
}

async function waitForPeers(managers: Managers) {
	const deviceIds = new Set(managers.map((m) => m.deviceId))
	const isDone = async () => {
		for (const manager of managers) {
			const unconnected = new Set(deviceIds)
			unconnected.delete(manager.deviceId)
			for (const peer of await manager.listLocalPeers()) {
				if (peer.status === 'connected') unconnected.delete(peer.deviceId)
			}
			if (unconnected.size > 0) return false
		}
		return true
	}
	while (!(await isDone())) {
		await new Promise((res) => setTimeout(res, 50))
	}
}

// Regression test for digidem/comapeo-mobile#2042 and #2041: a member is
// removed from a project, leaves it, and is re-invited. Accepting the new
// invite closes the old project instance on the manager
// (`MapeoManager.addProject`) and opens a fresh one. The project client
// wrapper is cached with `staleTime: Infinity`, so without invalidation the
// hooks keep using the closed instance and every project call rejects with
// ProjectClosed until app restart.
test(
	're-joining a project after leaving yields a working project instance',
	{ timeout: 60_000 },
	async (t) => {
		const invitor = setupCoreIpc()
		const invitee = setupCoreIpc()

		t.onTestFinished(async () => {
			await Promise.all([invitor.cleanup(), invitee.cleanup()])
		})

		await invitor.manager.setDeviceInfo({
			name: 'invitor',
			deviceType: 'desktop',
		})
		await invitee.manager.setDeviceInfo({
			name: 'invitee',
			deviceType: 'mobile',
		})

		const disconnect = connectPeers([invitor.manager, invitee.manager])
		t.onTestFinished(disconnect)
		await waitForPeers([invitor.manager, invitee.manager])

		const projectId = await invitor.manager.createProject({ name: 'mapeo' })
		const invitorProject = await invitor.manager.getProject(projectId)

		const queryClient = new QueryClient()
		const wrapper = createWrapper({ clientApi: invitee.client, queryClient })

		async function inviteAndAccept() {
			const invitePromise = pEvent(
				invitee.manager.invite as TypedEventEmitter<{
					'invite-received': [invite: InviteApi.Invite]
				}>,
				'invite-received',
			)
			const inviteSettled = invitorProject.$member.invite(
				invitee.manager.deviceId,
				{ roleId: MEMBER_ROLE_ID },
			)
			const { inviteId } = await invitePromise
			const acceptHook = renderHook(() => useAcceptInvite(), { wrapper })
			act(() => {
				acceptHook.result.current.mutate({ inviteId })
			})
			await waitFor(
				() => {
					assert.strictEqual(
						acceptHook.result.current.status,
						'success',
						`accept failed: ${acceptHook.result.current.error?.stack}`,
					)
				},
				{ timeout: 10_000 },
			)
			await inviteSettled
			acceptHook.unmount()
		}

		await inviteAndAccept()

		// Simulates app screens using the project after joining
		const projectHook = renderHook(
			({ projectId }) => useSingleProject({ projectId }),
			{ wrapper, initialProps: { projectId } },
		)
		await waitFor(() => {
			assert.isNotNull(projectHook.result.current)
			assert.ok(projectHook.result.current.data)
		})
		const originalWrapper = projectHook.result.current.data

		// Invitor removes the member
		await invitorProject.$member.assignRole(
			invitee.manager.deviceId,
			BLOCKED_ROLE_ID,
		)

		// Wait for the role change to sync to the invitee (the app listens for
		// this via `own-role-change` and shows the "removed from project" sheet)
		await waitFor(
			async () => {
				const role = await originalWrapper.$getOwnRole()
				assert.strictEqual(role.roleId, BLOCKED_ROLE_ID)
			},
			{ timeout: 10_000 },
		)

		// The app unmounts the removed project's screens before leaving
		projectHook.unmount()

		const leaveHook = renderHook(() => useLeaveProject(), { wrapper })
		act(() => {
			leaveHook.result.current.mutate({ projectId })
		})
		await waitFor(() => {
			assert.strictEqual(leaveHook.result.current.status, 'success')
		})
		leaveHook.unmount()

		// Invitor re-invites, invitee accepts. Accepting re-adds the project:
		// the manager closes the stale project instance and opens a fresh one.
		await inviteAndAccept()

		// Simulates the app navigating (back) into the project after re-joining:
		// the project provider and its dependent screens mount together, so a
		// stale cached project client would be handed to the dependent queries
		// synchronously (digidem/comapeo-mobile#2041's fatal ProjectClosed).
		const rejoinedProjectHook = renderHook(
			({ projectId }) => useSingleProject({ projectId }),
			{ wrapper, initialProps: { projectId } },
		)
		const settingsHook = renderHook(
			({ projectId }) => useProjectSettings({ projectId }),
			{ wrapper, initialProps: { projectId } },
		)
		await waitFor(() => {
			assert.isNotNull(rejoinedProjectHook.result.current)
			assert.ok(rejoinedProjectHook.result.current.data)
		})
		await waitFor(
			() => {
				assert.isNotNull(settingsHook.result.current)
				assert.isNull(settingsHook.result.current.error)
				assert.ok(settingsHook.result.current.data)
			},
			{ timeout: 10_000 },
		)
		assert.strictEqual(settingsHook.result.current.data.name, 'mapeo')

		assert.strictEqual(
			rejoinedProjectHook.result.current.data,
			originalWrapper,
			'Rejoined project uses original project client instance',
		)
	},
)

test.describe('invite over internet', () => {
	test('invitee joins from URL', { timeout: 30_000 }, async (t) => {
		// 1. Setup
		const testnet = await createTestnet(2)

		t.onTestFinished(() => {
			return testnet.destroy()
		})

		const invitor = setupCoreIpc({
			managerOverrides: { swarm: { dht: testnet.nodes[0] } },
		})

		const invitee = setupCoreIpc({
			managerOverrides: { swarm: { dht: testnet.nodes[0] } },
		})

		t.onTestFinished(async () => {
			await Promise.all([invitor.cleanup(), invitee.cleanup()])
		})

		await invitor.manager.setDeviceInfo({
			name: 'invitor',
			deviceType: 'desktop',
		})

		await invitee.manager.setDeviceInfo({
			name: 'invitee',
			deviceType: 'mobile',
		})

		const projectId = await invitor.manager.createProject({ name: 'mapeo' })

		const invitorWrapper = createWrapper({
			clientApi: invitor.client,
		})

		const inviteeWrapper = createWrapper({
			clientApi: invitee.client,
		})

		const manyMembersHook = renderHook(
			({ projectId }) => useManyMembers({ projectId, includeLeft: false }),
			{ wrapper: invitorWrapper, initialProps: { projectId } },
		)

		await waitFor(
			() => {
				assert.isNotNull(manyMembersHook.result.current)
				assert.isNull(manyMembersHook.result.current.error)
				assert.ok(manyMembersHook.result.current.data)
			},
			{ timeout: 10_000 },
		)

		assert.strictEqual(manyMembersHook.result.current.data.length, 1)

		// 2. Invitor: create invite link and wait for Invitee to send join request
		const createInviteLinkHook = renderHook(() => useCreateInviteLink(), {
			wrapper: invitorWrapper,
		})

		const inviteUrl = await act(() => {
			return createInviteLinkHook.result.current.mutateAsync({
				projectId,
				roleId: MEMBER_ROLE_ID,
			})
		})

		const inviteIdFromUrl = parseInviteURL(inviteUrl).inviteIdString

		const deferredInviteLinkJoinRequest = Promise.withResolvers<{
			projectId: string
			deviceId: string
			inviteId: string
		}>()

		invitor.manager.on(
			'invite-link-join-request',
			(projectId, deviceId, inviteId) => {
				if (inviteId !== inviteIdFromUrl) {
					return
				}

				deferredInviteLinkJoinRequest.resolve({
					projectId,
					deviceId,
					inviteId,
				})
			},
		)

		invitor.manager.on(
			'invite-link-join-request-error',
			(error, deviceId, inviteId) => {
				if (inviteId !== inviteIdFromUrl) {
					return
				}

				deferredInviteLinkJoinRequest.reject(
					new Error(
						`Invite link join error for device ${deviceId} and invite ${inviteId}`,
						{ cause: error },
					),
				)
			},
		)

		// 3. Invitee: create join request and wait for it to be accepted and completed
		const createJoinRequestHook = renderHook(() => useCreateJoinRequest(), {
			wrapper: inviteeWrapper,
		})
		const manyJoinRequestsHook = renderHook(() => useManyJoinRequests(), {
			wrapper: inviteeWrapper,
		})

		const createdJoinRequest = await act(() => {
			return createJoinRequestHook.result.current.mutateAsync({
				url: inviteUrl,
			})
		})

		const singleJoinRequestHook = renderHook(
			({ inviteId }) => useSingleJoinRequest({ inviteId }),
			{
				wrapper: inviteeWrapper,
				initialProps: { inviteId: createdJoinRequest.inviteId },
			},
		)

		await waitFor(() => {
			assert.strictEqual(
				manyJoinRequestsHook.result.current.isRefetching,
				false,
			)
			assert.isNull(manyJoinRequestsHook.result.current.error)
			assert.ok(manyJoinRequestsHook.result.current.data)

			assert.strictEqual(
				singleJoinRequestHook.result.current.isRefetching,
				false,
			)
			assert.isNull(singleJoinRequestHook.result.current.error)
			assert.ok(singleJoinRequestHook.result.current.data)
		})

		assert.strictEqual(manyJoinRequestsHook.result.current.data.length, 1)

		// Changes to the `status` field are managed by internal implementation details.
		{
			const { status: _, ...joinRequestFromManyJoinRequestsHook } =
				manyJoinRequestsHook.result.current.data[0]!

			const { status: __, ...joinRequestFromSingleJoinRequestHook } =
				singleJoinRequestHook.result.current.data

			const { status: ___, ...createdJoinRequestWithoutStatus } =
				createdJoinRequest

			assert.deepStrictEqual(
				joinRequestFromManyJoinRequestsHook,
				createdJoinRequestWithoutStatus,
			)
			assert.deepStrictEqual(
				joinRequestFromSingleJoinRequestHook,
				createdJoinRequestWithoutStatus,
			)
		}

		const deferredJoinRequestCompleted = Promise.withResolvers<void>()

		invitee.manager.inviteLinks.on('join-request-update', (update) => {
			if (update.inviteId !== createdJoinRequest.inviteId) {
				return
			}

			if (update.status === 'failed') {
				deferredJoinRequestCompleted.reject(update.error)
				return
			}

			if (update.status === 'completed') {
				deferredJoinRequestCompleted.resolve()
			}
		})

		const linkJoinRequestPayload = await deferredInviteLinkJoinRequest.promise

		const acceptInviteLinkRequestHook = renderHook(
			() => useAcceptInviteLinkRequest(),
			{ wrapper: invitorWrapper },
		)

		act(() => {
			acceptInviteLinkRequestHook.result.current.mutate(linkJoinRequestPayload)
		})

		await waitFor(
			() => {
				assert.strictEqual(
					acceptInviteLinkRequestHook.result.current.status,
					'success',
					`accept invite link request failed: ${acceptInviteLinkRequestHook.result.current.error?.stack}`,
				)
			},
			{ timeout: 10_000 },
		)

		await deferredJoinRequestCompleted.promise

		// 4. Updates to relevant read hooks
		await waitFor(() => {
			assert.strictEqual(manyMembersHook.result.current.isRefetching, false)

			assert.strictEqual(
				manyJoinRequestsHook.result.current.isRefetching,
				false,
			)

			assert.strictEqual(
				singleJoinRequestHook.result.current.isRefetching,
				false,
			)
		})

		assert.strictEqual(manyMembersHook.result.current.data.length, 2)
		assert.strictEqual(manyJoinRequestsHook.result.current.data.length, 0)
		assert.ok(
			getErrorCode(singleJoinRequestHook.result.current.error),
			NotFoundError.code,
		)
	})

	test(
		'invitor denies invitee join request',
		{ timeout: 30_000 },
		async (t) => {
			// 1. Setup
			const testnet = await createTestnet(2)

			t.onTestFinished(() => {
				return testnet.destroy()
			})

			const invitor = setupCoreIpc({
				managerOverrides: { swarm: { dht: testnet.nodes[0] } },
			})

			const invitee = setupCoreIpc({
				managerOverrides: { swarm: { dht: testnet.nodes[0] } },
			})

			t.onTestFinished(async () => {
				await Promise.all([invitor.cleanup(), invitee.cleanup()])
			})

			await invitor.manager.setDeviceInfo({
				name: 'invitor',
				deviceType: 'desktop',
			})

			await invitee.manager.setDeviceInfo({
				name: 'invitee',
				deviceType: 'mobile',
			})

			const projectId = await invitor.manager.createProject({ name: 'mapeo' })

			const invitorWrapper = createWrapper({
				clientApi: invitor.client,
			})

			const inviteeWrapper = createWrapper({
				clientApi: invitee.client,
			})

			const manyMembersHook = renderHook(
				({ projectId }) => useManyMembers({ projectId, includeLeft: false }),
				{ wrapper: invitorWrapper, initialProps: { projectId } },
			)

			await waitFor(
				() => {
					assert.isNotNull(manyMembersHook.result.current)
					assert.isNull(manyMembersHook.result.current.error)
					assert.ok(manyMembersHook.result.current.data)
				},
				{ timeout: 10_000 },
			)

			assert.strictEqual(manyMembersHook.result.current.data.length, 1)

			// 2. Invitor: create invite link and wait for Invitee to send join request
			const createInviteLinkHook = renderHook(() => useCreateInviteLink(), {
				wrapper: invitorWrapper,
			})

			const inviteUrl = await act(() => {
				return createInviteLinkHook.result.current.mutateAsync({
					projectId,
					roleId: MEMBER_ROLE_ID,
				})
			})

			const inviteIdFromUrl = parseInviteURL(inviteUrl).inviteIdString

			const deferredInviteLinkJoinRequest = Promise.withResolvers<{
				projectId: string
				deviceId: string
				inviteId: string
			}>()

			invitor.manager.on(
				'invite-link-join-request',
				(projectId, deviceId, inviteId) => {
					if (inviteId !== inviteIdFromUrl) {
						return
					}

					deferredInviteLinkJoinRequest.resolve({
						projectId,
						deviceId,
						inviteId,
					})
				},
			)

			invitor.manager.on(
				'invite-link-join-request-error',
				(error, deviceId, inviteId) => {
					if (inviteId !== inviteIdFromUrl) {
						return
					}

					deferredInviteLinkJoinRequest.reject(
						new Error(
							`Invite link join error for device ${deviceId} and invite ${inviteId}`,
							{ cause: error },
						),
					)
				},
			)

			// 3. Invitee: create join request and wait for it to be denied
			const createJoinRequestHook = renderHook(() => useCreateJoinRequest(), {
				wrapper: inviteeWrapper,
			})
			const manyJoinRequestsHook = renderHook(() => useManyJoinRequests(), {
				wrapper: inviteeWrapper,
			})

			const createdJoinRequest = await act(() => {
				return createJoinRequestHook.result.current.mutateAsync({
					url: inviteUrl,
				})
			})

			const singleJoinRequestHook = renderHook(
				({ inviteId }) => useSingleJoinRequest({ inviteId }),
				{
					wrapper: inviteeWrapper,
					initialProps: { inviteId: createdJoinRequest.inviteId },
				},
			)

			await waitFor(() => {
				assert.strictEqual(
					manyJoinRequestsHook.result.current.isRefetching,
					false,
				)
				assert.isNull(manyJoinRequestsHook.result.current.error)
				assert.ok(manyJoinRequestsHook.result.current.data)

				assert.strictEqual(
					singleJoinRequestHook.result.current.isRefetching,
					false,
				)
				assert.isNull(singleJoinRequestHook.result.current.error)
				assert.ok(singleJoinRequestHook.result.current.data)
			})

			assert.strictEqual(manyJoinRequestsHook.result.current.data.length, 1)

			// Changes to the `status` field are managed by internal implementation details.
			{
				const { status: _, ...joinRequestFromManyJoinRequestsHook } =
					manyJoinRequestsHook.result.current.data[0]!

				const { status: __, ...joinRequestFromSingleJoinRequestHook } =
					singleJoinRequestHook.result.current.data

				const { status: ___, ...createdJoinRequestWithoutStatus } =
					createdJoinRequest

				assert.deepStrictEqual(
					joinRequestFromManyJoinRequestsHook,
					createdJoinRequestWithoutStatus,
				)
				assert.deepStrictEqual(
					joinRequestFromSingleJoinRequestHook,
					createdJoinRequestWithoutStatus,
				)
			}

			const deferredJoinRequestDenied =
				Promise.withResolvers<InviteLinkJoiner.JoinRequestUpdate>()

			invitee.manager.inviteLinks.on('join-request-update', (update) => {
				if (update.inviteId !== createdJoinRequest.inviteId) {
					return
				}

				if (update.status === 'failed') {
					deferredJoinRequestDenied.resolve(update)
				} else {
					deferredJoinRequestDenied.reject(
						new Error('Unexpected join request update', { cause: update }),
					)
				}
			})

			const linkJoinRequestPayload = await deferredInviteLinkJoinRequest.promise

			const denyInviteLinkRequestHook = renderHook(
				() => useDenyInviteLinkRequest(),
				{ wrapper: invitorWrapper },
			)

			act(() => {
				denyInviteLinkRequestHook.result.current.mutate(linkJoinRequestPayload)
			})

			await waitFor(
				() => {
					assert.strictEqual(
						denyInviteLinkRequestHook.result.current.status,
						'success',
						`deny invite link request failed: ${denyInviteLinkRequestHook.result.current.error?.stack}`,
					)
				},
				{ timeout: 10_000 },
			)

			const joinRequestUpdatePayload = await deferredJoinRequestDenied.promise

			assert.strictEqual(
				getErrorCode(joinRequestUpdatePayload.error),
				InviteDeniedByInviterError.code,
			)

			// 4. Updates to relevant read hooks
			await waitFor(() => {
				assert.strictEqual(manyMembersHook.result.current.isRefetching, false)

				assert.strictEqual(
					manyJoinRequestsHook.result.current.isRefetching,
					false,
				)

				assert.strictEqual(
					singleJoinRequestHook.result.current.isRefetching,
					false,
				)
			})

			assert.strictEqual(manyMembersHook.result.current.data.length, 1)
			assert.strictEqual(manyJoinRequestsHook.result.current.data.length, 0)
			assert.ok(
				getErrorCode(singleJoinRequestHook.result.current.error),
				NotFoundError.code,
			)
		},
	)

	test('invitor cancels specific invite link', async (t) => {
		const testnet = await createTestnet(1)

		t.onTestFinished(() => {
			return testnet.destroy()
		})

		const invitor = setupCoreIpc({
			managerOverrides: { swarm: { dht: testnet.nodes[0] } },
		})

		t.onTestFinished(() => {
			return invitor.cleanup()
		})

		await invitor.manager.setDeviceInfo({
			name: 'invitor',
			deviceType: 'desktop',
		})

		const projectId = await invitor.manager.createProject({ name: 'mapeo' })

		const invitorWrapper = createWrapper({
			clientApi: invitor.client,
		})

		const createInviteLinkHook = renderHook(() => useCreateInviteLink(), {
			wrapper: invitorWrapper,
		})
		const cancelInviteLinkHook = renderHook(() => useCancelInviteLink(), {
			wrapper: invitorWrapper,
		})

		// 1. Invitor creates invite links
		const [inviteUrl1, inviteUrl2] = await act(() => {
			return Promise.all([
				createInviteLinkHook.result.current.mutateAsync({
					projectId,
					roleId: MEMBER_ROLE_ID,
				}),
				createInviteLinkHook.result.current.mutateAsync({
					projectId,
					roleId: MEMBER_ROLE_ID,
				}),
			])
		})

		const manyInviteLinksHook = renderHook(
			({ projectId }) => useManyInviteLinks({ projectId }),
			{ wrapper: invitorWrapper, initialProps: { projectId } },
		)

		await waitFor(() => {
			assert.strictEqual(manyInviteLinksHook.result.current.isRefetching, false)
			assert.isNull(manyInviteLinksHook.result.current.error)
			assert.ok(manyInviteLinksHook.result.current.data)
		})

		assert.strictEqual(manyInviteLinksHook.result.current.data.length, 2)

		// 2. Invitor cancels first invite link
		act(() => {
			cancelInviteLinkHook.result.current.mutate({
				projectId,
				inviteId: parseInviteURL(inviteUrl1).inviteIdString,
			})
		})

		await waitFor(() => {
			assert.strictEqual(cancelInviteLinkHook.result.current.status, 'success')
		})

		// 3. Updates to relevant read hooks
		await waitFor(() => {
			assert.strictEqual(manyInviteLinksHook.result.current.isRefetching, false)
		})

		assert.strictEqual(manyInviteLinksHook.result.current.data.length, 1)

		assert.strictEqual(
			manyInviteLinksHook.result.current.data[0]!.inviteId,
			parseInviteURL(inviteUrl2).inviteIdString,
		)
	})

	test('invitor cancels all invite links', async (t) => {
		const testnet = await createTestnet(1)

		t.onTestFinished(() => {
			return testnet.destroy()
		})

		const invitor = setupCoreIpc({
			managerOverrides: { swarm: { dht: testnet.nodes[0] } },
		})

		t.onTestFinished(() => {
			return invitor.cleanup()
		})

		await invitor.manager.setDeviceInfo({
			name: 'invitor',
			deviceType: 'desktop',
		})

		const projectId = await invitor.manager.createProject({ name: 'mapeo' })

		const invitorWrapper = createWrapper({
			clientApi: invitor.client,
		})

		const createInviteLinkHook = renderHook(() => useCreateInviteLink(), {
			wrapper: invitorWrapper,
		})
		const cancelInviteLinkHook = renderHook(() => useCancelInviteLink(), {
			wrapper: invitorWrapper,
		})

		// 1. Invitor creates invite links
		await act(() => {
			return Promise.all([
				createInviteLinkHook.result.current.mutateAsync({
					projectId,
					roleId: MEMBER_ROLE_ID,
				}),
				createInviteLinkHook.result.current.mutateAsync({
					projectId,
					roleId: MEMBER_ROLE_ID,
				}),
			])
		})

		const manyInviteLinksHook = renderHook(
			({ projectId }) => useManyInviteLinks({ projectId }),
			{ wrapper: invitorWrapper, initialProps: { projectId } },
		)

		await waitFor(() => {
			assert.strictEqual(manyInviteLinksHook.result.current.isRefetching, false)
			assert.isNull(manyInviteLinksHook.result.current.error)
			assert.ok(manyInviteLinksHook.result.current.data)
		})

		assert.strictEqual(manyInviteLinksHook.result.current.data.length, 2)

		// 2. Invitor cancels all invite links
		act(() => {
			cancelInviteLinkHook.result.current.mutate({ projectId })
		})

		await waitFor(() => {
			assert.strictEqual(cancelInviteLinkHook.result.current.status, 'success')
		})

		// 3. Updates to relevant read hooks
		await waitFor(() => {
			assert.strictEqual(manyInviteLinksHook.result.current.isRefetching, false)
		})

		assert.strictEqual(manyInviteLinksHook.result.current.data.length, 0)
	})

	test('invitee cancels join request', { timeout: 30_000 }, async (t) => {
		// 1. Setup
		const testnet = await createTestnet(2)

		t.onTestFinished(() => {
			return testnet.destroy()
		})

		const invitor = setupCoreIpc({
			managerOverrides: { swarm: { dht: testnet.nodes[0] } },
		})

		const invitee = setupCoreIpc({
			managerOverrides: { swarm: { dht: testnet.nodes[0] } },
		})

		t.onTestFinished(async () => {
			await Promise.all([invitor.cleanup(), invitee.cleanup()])
		})

		await invitor.manager.setDeviceInfo({
			name: 'invitor',
			deviceType: 'desktop',
		})

		await invitee.manager.setDeviceInfo({
			name: 'invitee',
			deviceType: 'mobile',
		})

		const projectId = await invitor.manager.createProject({ name: 'mapeo' })

		const invitorWrapper = createWrapper({
			clientApi: invitor.client,
		})

		const inviteeWrapper = createWrapper({
			clientApi: invitee.client,
		})

		const manyMembersHook = renderHook(
			({ projectId }) => useManyMembers({ projectId, includeLeft: false }),
			{ wrapper: invitorWrapper, initialProps: { projectId } },
		)

		await waitFor(
			() => {
				assert.isNotNull(manyMembersHook.result.current)
				assert.isNull(manyMembersHook.result.current.error)
				assert.ok(manyMembersHook.result.current.data)
			},
			{ timeout: 10_000 },
		)

		assert.strictEqual(manyMembersHook.result.current.data.length, 1)

		// 2. Invitor: create invite link
		const createInviteLinkHook = renderHook(() => useCreateInviteLink(), {
			wrapper: invitorWrapper,
		})

		const inviteUrl = await act(() => {
			return createInviteLinkHook.result.current.mutateAsync({
				projectId,
				roleId: MEMBER_ROLE_ID,
			})
		})

		// 3. Invitee: create join request
		const createJoinRequestHook = renderHook(() => useCreateJoinRequest(), {
			wrapper: inviteeWrapper,
		})
		const manyJoinRequestsHook = renderHook(() => useManyJoinRequests(), {
			wrapper: inviteeWrapper,
		})

		const createdJoinRequest = await act(() => {
			return createJoinRequestHook.result.current.mutateAsync({
				url: inviteUrl,
			})
		})

		const singleJoinRequestHook = renderHook(
			({ inviteId }) => useSingleJoinRequest({ inviteId }),
			{
				wrapper: inviteeWrapper,
				initialProps: { inviteId: createdJoinRequest.inviteId },
			},
		)

		await waitFor(() => {
			assert.strictEqual(
				manyJoinRequestsHook.result.current.isRefetching,
				false,
			)
			assert.isNull(manyJoinRequestsHook.result.current.error)
			assert.ok(manyJoinRequestsHook.result.current.data)

			assert.strictEqual(
				singleJoinRequestHook.result.current.isRefetching,
				false,
			)
			assert.isNull(singleJoinRequestHook.result.current.error)
			assert.ok(singleJoinRequestHook.result.current.data)
		})

		assert.strictEqual(manyJoinRequestsHook.result.current.data.length, 1)

		// Changes to the `status` field are managed by internal implementation details.
		{
			const { status: __, ...joinRequestFromSingleJoinRequestHook } =
				singleJoinRequestHook.result.current.data

			const { status: ___, ...createdJoinRequestWithoutStatus } =
				createdJoinRequest

			assert.deepStrictEqual(
				joinRequestFromSingleJoinRequestHook,
				createdJoinRequestWithoutStatus,
			)
		}

		// 4. Invitee: cancel join request
		const cancelJoinRequestHook = renderHook(() => useCancelJoinRequest(), {
			wrapper: inviteeWrapper,
		})

		act(() => {
			cancelJoinRequestHook.result.current.mutate({
				inviteId: createdJoinRequest.inviteId,
			})
		})

		await waitFor(() => {
			assert.strictEqual(
				cancelJoinRequestHook.result.current.status,
				'success',
				`cancel join request failed: ${cancelJoinRequestHook.result.current.error?.stack}`,
			)
		})

		// 4. Updates to relevant read hooks
		await waitFor(() => {
			assert.strictEqual(
				manyJoinRequestsHook.result.current.isRefetching,
				false,
			)

			assert.strictEqual(
				singleJoinRequestHook.result.current.isRefetching,
				false,
			)
		})

		assert.strictEqual(manyJoinRequestsHook.result.current.data.length, 0)
		assert.ok(
			getErrorCode(singleJoinRequestHook.result.current.error),
			NotFoundError.code,
		)
	})
})

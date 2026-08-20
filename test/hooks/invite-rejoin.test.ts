// @vitest-environment node
import '../helpers/jsdom-setup.js'

import type { InviteApi } from '@comapeo/core'
import { QueryClient } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { pEvent, type TypedEventEmitter } from 'p-event'
import { assert, test } from 'vitest'

import {
	useAcceptInvite,
	useLeaveProject,
	useProjectSettings,
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
// invite re-adds the project on the manager (`MapeoManager.addProject`),
// which closes the instance left behind by leaving and opens a fresh one.
// The project must be usable again from the hooks straight afterwards,
// rather than every call rejecting until the app restarts.
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

		// The regression itself: a call made directly through the reference the
		// hooks hand out has to reach a live instance, not the closed one that
		// was cached before the leave. Asserted through the reference rather
		// than only through the settings query, because it is the cached
		// reference that #199 was about.
		//
		// What the reference *is* differs by major and is deliberately not
		// asserted: @comapeo/ipc v9 hands out a fresh wrapper and leaves the
		// pre-leave one permanently closed, while v10 hands back the same
		// permanent reference, re-routed to a re-opened instance.
		const rejoinedProjectApi = rejoinedProjectHook.result.current.data
		const settingsFromReference = await rejoinedProjectApi.$getProjectSettings()
		assert.strictEqual(settingsFromReference.name, 'mapeo')
	},
)

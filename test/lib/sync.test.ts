/**
 * @vitest-environment node
 */
import type { ComapeoProjectClientApi } from '@comapeo/ipc'
import { describe, expect, it } from 'vitest'

import { SyncStore, type SyncState } from '../../src/lib/sync.js'

type DeviceCounts = Record<string, { want: number; wanted: number }>

function createSyncState(devices: DeviceCounts): SyncState {
	const remoteDeviceSyncState: SyncState['remoteDeviceSyncState'] = {}
	for (const [deviceId, counts] of Object.entries(devices)) {
		remoteDeviceSyncState[deviceId] = {
			initial: { isSyncEnabled: true, want: 0, wanted: 0 },
			data: { isSyncEnabled: true, ...counts },
		}
	}
	return {
		initial: { isSyncEnabled: true },
		data: { isSyncEnabled: true },
		remoteDeviceSyncState,
	}
}

function createFakeProject(initialState: SyncState) {
	let listener: ((state: SyncState) => void) | undefined
	const project = {
		$sync: {
			getState: async () => initialState,
			on: (_event: 'sync-state', fn: (state: SyncState) => void) => {
				listener = fn
			},
			off: () => {
				listener = undefined
			},
		},
	}
	return {
		project: project as unknown as ComapeoProjectClientApi,
		emitState: (state: SyncState) => listener?.(state),
	}
}

describe('SyncStore data progress', () => {
	it('is not complete while any syncing device still has blocks to exchange', async () => {
		const { project, emitState } = createFakeProject(
			createSyncState({
				cloud: { want: 5, wanted: 0 },
				phone: { want: 5, wanted: 0 },
			}),
		)
		const store = new SyncStore(project)
		const unsubscribe = store.subscribe(() => {})
		await expect.poll(() => store.getStateSnapshot()).not.toBeNull()

		emitState(
			createSyncState({
				cloud: { want: 5, wanted: 0 },
				phone: { want: 0, wanted: 0 },
			}),
		)

		expect(store.getDataProgressSnapshot()).toBe(0.5)
		unsubscribe()
	})
})

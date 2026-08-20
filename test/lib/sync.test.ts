/**
 * @vitest-environment node
 */
import type { ComapeoProjectClientApi } from '@comapeo/ipc'
import { describe, expect, it, vi } from 'vitest'

import {
	refreshActiveSyncStores,
	SyncStore,
	type SyncState,
} from '../../src/lib/sync.js'

function createSyncState({
	isSyncEnabled = false,
	devices = {},
}: {
	isSyncEnabled?: boolean
	/** Sync-enabled remote devices, by outstanding `want` count */
	devices?: Record<string, number>
} = {}): SyncState {
	return {
		data: { isSyncEnabled },
		remoteDeviceSyncState: Object.fromEntries(
			Object.entries(devices).map(([deviceId, want]) => [
				deviceId,
				{ data: { isSyncEnabled: true, want, wanted: 0 } },
			]),
		),
	} as unknown as SyncState
}

function createProject({
	throwOnOff = false,
	throwOnOn = false,
}: { throwOnOff?: boolean; throwOnOn?: boolean } = {}) {
	const on = vi.fn(() => {
		if (throwOnOn) throw new Error('ProjectClosed')
	})
	const off = vi.fn(() => {
		if (throwOnOff) throw new Error('ProjectClosed')
	})
	const getState = vi.fn(async () => {
		throw new Error('ProjectClosed')
	})

	return {
		project: {
			$sync: { on, off, getState },
		} as unknown as ComapeoProjectClientApi,
		on,
		off,
	}
}

// `on`/`off` throw on a project wrapper closed by a backend restart in
// @comapeo/ipc v9, and on any reference after the whole client is closed. The
// unsubscribe runs in React effect cleanup, where a throw would take down the
// tree, so both emitter calls have to tolerate it.
describe('SyncStore with a closed project wrapper', () => {
	it('does not throw from the unsubscribe returned by subscribe()', () => {
		const { project, off } = createProject({ throwOnOff: true })
		const store = new SyncStore(project)

		const unsubscribe = store.subscribe(() => {})

		expect(() => unsubscribe()).not.toThrow()
		expect(off).toHaveBeenCalled()
	})

	it('does not throw from subscribe() when adding the listener fails', () => {
		const { project, on } = createProject({ throwOnOn: true })
		const store = new SyncStore(project)

		expect(() => store.subscribe(() => {})).not.toThrow()
		expect(on).toHaveBeenCalled()
		// The failure is surfaced through the snapshot, the same way a rejected
		// `getState()` is
		expect(() => store.getStateSnapshot()).toThrow(/ProjectClosed/)
	})
})

function createLiveProject() {
	const listeners = new Set<(state: SyncState) => void>()
	let nextState = createSyncState()

	const on = vi.fn((_event: string, listener: (state: SyncState) => void) => {
		listeners.add(listener)
	})
	const off = vi.fn((_event: string, listener: (state: SyncState) => void) => {
		listeners.delete(listener)
	})
	const getState = vi.fn(async () => nextState)

	return {
		project: {
			$sync: { on, off, getState },
		} as unknown as ComapeoProjectClientApi,
		on,
		off,
		getState,
		listenerCount: () => listeners.size,
		emit(state: SyncState) {
			nextState = state
			for (const listener of listeners) listener(state)
		},
		setNextState(state: SyncState) {
			nextState = state
		},
	}
}

// With a permanent project client reference (@comapeo/ipc v10) the per-project
// store cache hands back the same `SyncStore` after a backend restart, so
// anything it latched from the previous backend has to be cleared explicitly.
describe('recovering a SyncStore after a backend restart', () => {
	it('clears a sticky error on a store that is still listened to', async (t) => {
		const project = createLiveProject()
		project.getState.mockRejectedValueOnce(new Error('ProjectClosed'))

		const store = new SyncStore(project.project)
		t.onTestFinished(store.subscribe(() => {}))

		await vi.waitFor(() => {
			expect(() => store.getStateSnapshot()).toThrow(/ProjectClosed/)
		})

		const fresh = createSyncState({ isSyncEnabled: true })
		project.setNextState(fresh)
		refreshActiveSyncStores()

		expect(() => store.getStateSnapshot()).not.toThrow()
		await vi.waitFor(() => {
			expect(store.getStateSnapshot()).toBe(fresh)
		})
	})

	// The real sequence when the error reaches a boundary: the snapshot throws
	// during render, the boundary unmounts the subtree, and that removes the
	// last listener. The remount is handed back this same store and reads the
	// snapshot during render, before `subscribe` can run — so the error must
	// not still be there.
	it('recovers a store whose error boundary unmounted every listener', async () => {
		const project = createLiveProject()
		project.getState.mockRejectedValueOnce(new Error('ProjectClosed'))

		const store = new SyncStore(project.project)
		const unsubscribe = store.subscribe(() => {})

		await vi.waitFor(() => {
			expect(() => store.getStateSnapshot()).toThrow(/ProjectClosed/)
		})

		unsubscribe()
		const fresh = createSyncState({ isSyncEnabled: true })
		project.setNextState(fresh)

		refreshActiveSyncStores()

		expect(() => store.getStateSnapshot()).not.toThrow()

		const unsubscribeAfterRemount = store.subscribe(() => {})
		await vi.waitFor(() => {
			expect(store.getStateSnapshot()).toBe(fresh)
		})
		unsubscribeAfterRemount()
	})

	// Same wedge, without a restart: a boundary that offers a retry button has
	// to be able to get somewhere on its own.
	it('recovers a remount with no restart notification at all', async () => {
		const project = createLiveProject()
		project.getState.mockRejectedValueOnce(new Error('ProjectClosed'))

		const store = new SyncStore(project.project)
		const unsubscribe = store.subscribe(() => {})

		await vi.waitFor(() => {
			expect(() => store.getStateSnapshot()).toThrow(/ProjectClosed/)
		})

		unsubscribe()

		expect(() => store.getStateSnapshot()).not.toThrow()

		const fresh = createSyncState({ isSyncEnabled: true })
		project.setNextState(fresh)
		const unsubscribeAfterRemount = store.subscribe(() => {})
		await vi.waitFor(() => {
			expect(store.getStateSnapshot()).toBe(fresh)
		})
		unsubscribeAfterRemount()
	})

	it('notifies listeners with the state from the new backend', async (t) => {
		const project = createLiveProject()
		const store = new SyncStore(project.project)
		const listener = vi.fn()
		t.onTestFinished(store.subscribe(listener))

		await vi.waitFor(() => {
			expect(store.getStateSnapshot()).not.toBeNull()
		})
		listener.mockClear()

		const fresh = createSyncState({ isSyncEnabled: true })
		project.setNextState(fresh)
		refreshActiveSyncStores()

		await vi.waitFor(() => {
			expect(store.getStateSnapshot()).toBe(fresh)
		})
		expect(listener).toHaveBeenCalled()
		// The transport owner re-sends its subscriptions before announcing the
		// restart, so the store must not attach a second listener
		expect(project.listenerCount()).toBe(1)
	})

	// Progress is a ratio against the largest sync count seen so far. Clearing
	// those baselines while keeping the previous backend's state makes the
	// ratio read 1, which the UI shows as "sync complete".
	it('never reports sync as complete on the way through a restart', async (t) => {
		const project = createLiveProject()
		const store = new SyncStore(project.project)
		const seen: Array<number | null> = []
		t.onTestFinished(
			store.subscribe(() => {
				seen.push(store.getDataProgressSnapshot())
			}),
		)

		await vi.waitFor(() => {
			expect(store.getStateSnapshot()).not.toBeNull()
		})
		project.emit(createSyncState({ devices: { 'device-a': 10 } }))
		project.emit(createSyncState({ devices: { 'device-a': 5 } }))
		expect(store.getDataProgressSnapshot()).toBe(0.5)

		project.setNextState(createSyncState({ devices: { 'device-a': 8 } }))
		refreshActiveSyncStores()

		// Not known yet, rather than a number derived from the dead backend
		expect(store.getDataProgressSnapshot()).toBeNull()
		await vi.waitFor(() => {
			expect(store.getStateSnapshot()).not.toBeNull()
		})
		expect(store.getDataProgressSnapshot()).toBe(0)
		expect(seen).not.toContain(1)
	})

	it('does not touch a store with no listeners', async () => {
		const project = createLiveProject()
		const store = new SyncStore(project.project)
		const unsubscribe = store.subscribe(() => {})

		await vi.waitFor(() => {
			expect(store.getStateSnapshot()).not.toBeNull()
		})

		unsubscribe()
		project.getState.mockClear()

		refreshActiveSyncStores()

		expect(project.getState).not.toHaveBeenCalled()
	})

	it('re-attaches the listener when the first attach failed', async (t) => {
		const project = createLiveProject()
		project.on.mockImplementationOnce(() => {
			throw new Error('ProjectClosed')
		})

		const store = new SyncStore(project.project)
		t.onTestFinished(store.subscribe(() => {}))

		expect(() => store.getStateSnapshot()).toThrow(/ProjectClosed/)
		expect(project.listenerCount()).toBe(0)

		refreshActiveSyncStores()

		expect(project.listenerCount()).toBe(1)
		await vi.waitFor(() => {
			expect(store.getStateSnapshot()).not.toBeNull()
		})
	})
})

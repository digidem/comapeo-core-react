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

function createSyncState(isSyncEnabled: boolean): SyncState {
	return {
		data: { isSyncEnabled },
		remoteDeviceSyncState: {},
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

// A backend restart closes the project wrapper this store was built from. The
// unsubscribe runs in React effect cleanup, where a throw would take down the
// tree, so both emitter calls have to tolerate a closed wrapper.
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
	let nextState = createSyncState(false)

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
		setNextState(state: SyncState) {
			nextState = state
		},
	}
}

// Under @comapeo/ipc v10 the project client reference is permanent, so the
// per-project store cache hands back the same `SyncStore` after a backend
// restart. Without an explicit refresh it would keep throwing the error it
// latched when the backend went away.
describe('refreshActiveSyncStores()', () => {
	it('clears a sticky error and re-reads state', async (t) => {
		const project = createLiveProject()
		project.getState.mockRejectedValueOnce(new Error('ProjectClosed'))

		const store = new SyncStore(project.project)
		const unsubscribe = store.subscribe(() => {})
		t.onTestFinished(unsubscribe)

		await vi.waitFor(() => {
			expect(() => store.getStateSnapshot()).toThrow(/ProjectClosed/)
		})

		const fresh = createSyncState(true)
		project.setNextState(fresh)
		refreshActiveSyncStores()

		expect(() => store.getStateSnapshot()).not.toThrow()
		await vi.waitFor(() => {
			expect(store.getStateSnapshot()).toBe(fresh)
		})
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

		const fresh = createSyncState(true)
		project.setNextState(fresh)
		refreshActiveSyncStores()

		await vi.waitFor(() => {
			expect(store.getStateSnapshot()).toBe(fresh)
		})
		expect(listener).toHaveBeenCalled()
		// The subscription is re-sent by the transport owner before the restart is
		// announced, so the store must not attach a second listener
		expect(project.listenerCount()).toBe(1)
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

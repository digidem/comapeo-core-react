/**
 * @vitest-environment node
 */
import type { ComapeoProjectClientApi } from '@comapeo/ipc'
import { describe, expect, it, vi } from 'vitest'

import { SyncStore } from '../../src/lib/sync.js'

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

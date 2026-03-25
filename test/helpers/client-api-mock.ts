import { vi } from 'vitest'

export type MockClientApi = {
	on: ReturnType<typeof vi.fn>
	off: ReturnType<typeof vi.fn>
	emit: (event: string, data: unknown) => void
	listeners: Map<string, Array<(data: unknown) => void>>
	getProject: ReturnType<typeof vi.fn>
	sendMapShare: ReturnType<typeof vi.fn>
	invite: {
		addListener: ReturnType<typeof vi.fn>
		removeListener: ReturnType<typeof vi.fn>
	}
}

export function createMockClientApi(): MockClientApi {
	const listeners = new Map<string, Array<(data: unknown) => void>>()

	const on = vi.fn((event: string, listener: (data: unknown) => void) => {
		if (!listeners.has(event)) {
			listeners.set(event, [])
		}
		listeners.get(event)!.push(listener)
	})

	const off = vi.fn((event: string, listener: (data: unknown) => void) => {
		const eventListeners = listeners.get(event)
		if (eventListeners) {
			const index = eventListeners.indexOf(listener)
			if (index > -1) {
				eventListeners.splice(index, 1)
			}
		}
	})

	const emit = (event: string, data: unknown) => {
		const eventListeners = listeners.get(event)
		if (eventListeners) {
			for (const listener of eventListeners) {
				listener(data)
			}
		}
	}

	const sendMapShare = vi.fn().mockResolvedValue(undefined)
	const getProject = vi.fn()

	const invite = {
		addListener: vi.fn(),
		removeListener: vi.fn(),
	}

	return { on, off, emit, listeners, getProject, sendMapShare, invite }
}

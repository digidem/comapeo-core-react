/**
 * Shared test utilities for map shares store tests.
 */
import type { MapShare } from '@comapeo/core'
import { MapShareState as ServerMapShareState } from '@comapeo/map-server'
import ky from 'ky'

import type { ServerInstance } from '../helpers/map-server.js'

export function createShare(sender: ServerInstance, receiver: ServerInstance) {
	return ky
		.post(sender.localBaseUrl + '/mapShares', {
			json: {
				mapId: 'custom',
				receiverDeviceId: receiver.deviceId,
			},
		})
		.json<ServerMapShareState>()
}

/**
 * Creates a MapShare object from the server-side share state.
 * This simulates what the client would receive from the map-share event.
 */
export function createMapShareFromServerShare(
	senderDeviceId: string,
	serverShare: ServerMapShareState,
): MapShare {
	return {
		...serverShare,
		mapShareReceivedAt: Date.now(),
		senderDeviceId,
		senderDeviceName: 'Test Sender',
	}
}

/**
 * Waits for a store state to match a predicate.
 */
export async function waitForStoreState<T>(
	store: {
		getSnapshot: () => T
		subscribe: (listener: () => void) => () => void
	},
	predicate: (state: T) => boolean,
	timeoutMs = 5000,
): Promise<void> {
	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => {
			unsubscribe()
			reject(new Error(`Timed out waiting for store state`))
		}, timeoutMs)

		if (predicate(store.getSnapshot())) {
			clearTimeout(timeout)
			resolve()
			return
		}

		const unsubscribe = store.subscribe(() => {
			const state = store.getSnapshot()
			if (predicate(state)) {
				clearTimeout(timeout)
				unsubscribe()
				resolve()
			}
		})
	})
}

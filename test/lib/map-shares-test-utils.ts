/**
 * Shared test utilities for map shares store tests.
 */
import type { MapShare } from '@comapeo/core'
import { type MapShareState as ServerMapShareState } from '@comapeo/map-server'
import ky from 'ky'
import { vi } from 'vitest'

import {
	createMapServerApi,
	type MapServerApi,
} from '../../src/contexts/MapServer.js'
import { DEMOTILES_Z2, OSM_BRIGHT_Z6 } from '../helpers/constants.js'
import { startTestServer } from './startTestServer.js'

export type ServerInstance = {
	get: (typeof ky)['get']
	post: (typeof ky)['post']
	localBaseUrl: string
	remotePort: number
	deviceId: string
	eventsPath: (id: string) => string
	mapServerApi: MapServerApi
}

export async function startTestServers(t: {
	onTestFinished: (fn: () => Promise<void>) => void
}) {
	const [sender, receiver] = await Promise.all([
		startTestServer(t, OSM_BRIGHT_Z6, 0),
		startTestServer(t, DEMOTILES_Z2, 1),
	])

	const kyDefaults = ky.create({ retry: 0, throwHttpErrors: false })
	const senderKy = kyDefaults.extend({ prefixUrl: sender.localBaseUrl })
	const receiverKy = kyDefaults.extend({ prefixUrl: receiver.localBaseUrl })

	const senderInstance: ServerInstance = {
		get: senderKy.get.bind(senderKy),
		post: senderKy.post.bind(senderKy),
		localBaseUrl: sender.localBaseUrl,
		remotePort: sender.remotePort,
		deviceId: sender.deviceId,
		eventsPath: (id: string) => `/mapShares/${id}/events`,
		mapServerApi: createMapServerApi({
			getBaseUrl: async () => new URL(sender.localBaseUrl),
		}),
	}

	const receiverInstance: ServerInstance = {
		get: receiverKy.get.bind(receiverKy),
		post: receiverKy.post.bind(receiverKy),
		localBaseUrl: receiver.localBaseUrl,
		remotePort: receiver.remotePort,
		deviceId: receiver.deviceId,
		eventsPath: (id: string) => `/downloads/${id}/events`,
		mapServerApi: createMapServerApi({
			getBaseUrl: async () => new URL(receiver.localBaseUrl),
		}),
	}

	const createShare = () =>
		senderKy
			.post<ServerMapShareState>('mapShares', {
				json: {
					mapId: 'custom',
					receiverDeviceId: receiverInstance.deviceId,
				},
			})
			.json()

	return {
		sender: senderInstance,
		receiver: receiverInstance,
		createShare,
	}
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

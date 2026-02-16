/**
 * Shared test utilities for map shares store tests.
 */
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { MapShare } from '@comapeo/core'
import {
	createServer,
	type MapShareState as ServerMapShareState,
} from '@comapeo/map-server'
import ky from 'ky'
import { Agent as SecretStreamAgent } from 'secret-stream-http'
import { uint8ArrayToHex } from 'uint8array-extras'
import { vi } from 'vitest'

import {
	createMapServerApi,
	type MapServerApi,
} from '../../src/contexts/MapServer.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURES_DIR = path.join(__dirname, '../fixtures')
export const OSM_BRIGHT_Z6 = path.join(FIXTURES_DIR, 'osm-bright-z6.smp')
export const DEMOTILES_Z2 = path.join(FIXTURES_DIR, 'demotiles-z2.smp')
export const ONLINE_STYLE_URL = 'https://demotiles.maplibre.org/style.json'

export type ServerInstance = {
	get: (typeof ky)['get']
	post: (typeof ky)['post']
	localBaseUrl: string
	remotePort: number
	deviceId: string
	eventsPath: (id: string) => string
	mapServerApi: MapServerApi
}

let tmpCounter = 0

export async function startTestServer(
	t: { onTestFinished: (fn: () => Promise<void>) => void },
	customMapPath?: string,
	seed = 0,
) {
	const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'map-server-test-'))
	const tmpCustomMapPath = path.join(tmpDir, `custom-map-${tmpCounter++}.smp`)

	if (customMapPath) {
		await fs.copyFile(customMapPath, tmpCustomMapPath)
	}

	const keyPair = SecretStreamAgent.keyPair(Buffer.alloc(32, seed))
	const server = createServer({
		defaultOnlineStyleUrl: ONLINE_STYLE_URL,
		fallbackMapPath: DEMOTILES_Z2,
		customMapPath: tmpCustomMapPath,
		keyPair,
	})

	t.onTestFinished(async () => {
		await fs.unlink(tmpCustomMapPath).catch(() => {})
		await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {})
		await server.close()
	})

	const { localPort, remotePort } = await server.listen()
	const localBaseUrl = `http://127.0.0.1:${localPort}`

	return {
		localPort,
		remotePort,
		localBaseUrl,
		keyPair,
		deviceId: uint8ArrayToHex(keyPair.publicKey),
	}
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

export type MockClientApi = {
	on: ReturnType<typeof vi.fn>
	off: ReturnType<typeof vi.fn>
	emit: (event: string, data: unknown) => void
	listeners: Map<string, Array<(data: unknown) => void>>
	getProject: ReturnType<typeof vi.fn>
	$sendMapShare: ReturnType<typeof vi.fn>
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

	const $sendMapShare = vi.fn().mockResolvedValue(undefined)
	const getProject = vi.fn().mockResolvedValue({ $sendMapShare })

	const invite = {
		addListener: vi.fn(),
		removeListener: vi.fn(),
	}

	return { on, off, emit, listeners, getProject, $sendMapShare, invite }
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

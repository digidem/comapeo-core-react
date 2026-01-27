import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer, type MapShareState } from '@comapeo/map-server'
import ky from 'ky'
import { Agent as SecretStreamAgent } from 'secret-stream-http'
import type { TestContext } from 'vitest'
// @ts-expect-error - z32 does not have type declarations
import z32 from 'z32'

// Fixtures from the map-server-tests directory
const MAP_SERVER_TESTS_DIR = path.join(
	path.dirname(fileURLToPath(import.meta.url)),
	'../../map-server-tests/fixtures',
)
export const OSM_BRIGHT_Z6 = path.join(
	MAP_SERVER_TESTS_DIR,
	'osm-bright-z6.smp',
)
export const DEMOTILES_Z2 = path.join(MAP_SERVER_TESTS_DIR, 'demotiles-z2.smp')
export const ONLINE_STYLE_URL = 'https://demotiles.maplibre.org/style.json'

function noop() {}

export type ServerInstance = {
	/** ky instance for making HTTP requests */
	get: (typeof ky)['get']
	post: (typeof ky)['post']
	put: (typeof ky)['put']
	delete: (typeof ky)['delete']
	localBaseUrl: string
	localPort: number
	keyPair: ReturnType<typeof SecretStreamAgent.keyPair>
	deviceId: string
}

export type SenderInstance = ServerInstance & {
	remotePort: number
	eventsPath: (id: string) => string
}

export type ReceiverInstance = ServerInstance & {
	customMapPath: string
	eventsPath: (id: string) => string
}

let tmpCounter = 0

/**
 * Start a single map server for testing.
 */
export async function startMapServer(
	t: TestContext,
	options?: {
		customMapPath?: string
		keyPair?: ReturnType<typeof SecretStreamAgent.keyPair>
	},
) {
	const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'map-server-test-'))
	const tmpCustomMapPath = path.join(
		tmpDir,
		`custom-map-path-${tmpCounter++}.smp`,
	)

	// Copy the fixture to a temp location to avoid mutations during tests
	try {
		await fs.copyFile(options?.customMapPath ?? OSM_BRIGHT_Z6, tmpCustomMapPath)
	} catch (err) {
		// @ts-expect-error - checking error code
		if (err.code !== 'ENOENT') {
			throw err
		}
	}

	const keyPair = options?.keyPair ?? SecretStreamAgent.keyPair()
	const server = createServer({
		defaultOnlineStyleUrl: ONLINE_STYLE_URL,
		fallbackMapPath: DEMOTILES_Z2,
		customMapPath: tmpCustomMapPath,
		keyPair,
	})

	t.onTestFinished(async () => {
		await fs.unlink(tmpCustomMapPath).catch(noop)
		await fs.rm(tmpDir, { recursive: true, force: true }).catch(noop)
		await server.close()
	})

	const { localPort, remotePort } = await server.listen()

	return {
		server,
		localPort,
		remotePort,
		localBaseUrl: `http://127.0.0.1:${localPort}`,
		keyPair,
		customMapPath: tmpCustomMapPath,
	}
}

/**
 * Start sender and receiver map servers for testing map sharing.
 */
export async function startMapServers(
	t: TestContext,
	options?: {
		senderOptions?: {
			customMapPath?: string
			keyPair?: ReturnType<typeof SecretStreamAgent.keyPair>
		}
		receiverOptions?: {
			customMapPath?: string
			keyPair?: ReturnType<typeof SecretStreamAgent.keyPair>
		}
	},
) {
	// Deterministic key pairs for sender and receiver
	const senderKeyPair =
		options?.senderOptions?.keyPair ??
		SecretStreamAgent.keyPair(Buffer.alloc(32, 0))
	const receiverKeyPair =
		options?.receiverOptions?.keyPair ??
		SecretStreamAgent.keyPair(Buffer.alloc(32, 1))

	const [sender, receiver] = await Promise.all([
		startMapServer(t, {
			customMapPath: options?.senderOptions?.customMapPath ?? OSM_BRIGHT_Z6,
			keyPair: senderKeyPair,
		}),
		startMapServer(t, {
			customMapPath: options?.receiverOptions?.customMapPath ?? DEMOTILES_Z2,
			keyPair: receiverKeyPair,
		}),
	])

	const kyDefaults = ky.create({ retry: 0, throwHttpErrors: false })
	const senderKy = kyDefaults.extend({ prefixUrl: sender.localBaseUrl })
	const receiverKy = kyDefaults.extend({ prefixUrl: receiver.localBaseUrl })

	const senderInstance: SenderInstance = {
		get: senderKy.get.bind(senderKy),
		post: senderKy.post.bind(senderKy),
		put: senderKy.put.bind(senderKy),
		delete: senderKy.delete.bind(senderKy),
		localBaseUrl: sender.localBaseUrl,
		localPort: sender.localPort,
		remotePort: sender.remotePort,
		keyPair: senderKeyPair,
		deviceId: z32.encode(senderKeyPair.publicKey),
		eventsPath: (id: string) => `/mapShares/${id}/events`,
	}

	const receiverInstance: ReceiverInstance = {
		get: receiverKy.get.bind(receiverKy),
		post: receiverKy.post.bind(receiverKy),
		put: receiverKy.put.bind(receiverKy),
		delete: receiverKy.delete.bind(receiverKy),
		localBaseUrl: receiver.localBaseUrl,
		localPort: receiver.localPort,
		keyPair: receiverKeyPair,
		deviceId: z32.encode(receiverKeyPair.publicKey),
		customMapPath: receiver.customMapPath,
		eventsPath: (id: string) => `/downloads/${id}/events`,
	}

	/**
	 * Create a map share on the sender's server
	 */
	const createShare = () =>
		senderKy.post<MapShareState>('mapShares', {
			json: {
				mapId: 'custom',
				receiverDeviceId: receiverInstance.deviceId,
			},
		})

	/**
	 * Create a download on the receiver's server
	 */
	const createDownload = (
		share: Pick<
			MapShareState,
			'shareId' | 'mapShareUrls' | 'estimatedSizeBytes'
		>,
	) =>
		receiverKy.post('downloads', {
			json: {
				senderDeviceId: senderInstance.deviceId,
				shareId: share.shareId,
				mapShareUrls: share.mapShareUrls,
				estimatedSizeBytes: share.estimatedSizeBytes,
			},
		})

	return {
		sender: senderInstance,
		receiver: receiverInstance,
		createShare,
		createDownload,
	}
}

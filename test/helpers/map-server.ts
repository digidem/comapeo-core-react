import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from '@comapeo/map-server'
import { Agent as SecretStreamAgent } from 'secret-stream-http'
import { uint8ArrayToHex } from 'uint8array-extras'
import type { TestContext } from 'vitest'

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

export type ServerInstance = Awaited<ReturnType<typeof startMapServer>>

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
	if (options?.customMapPath) {
		await fs.copyFile(options.customMapPath, tmpCustomMapPath)
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
		deviceId: uint8ArrayToHex(keyPair.publicKey),
	}
}

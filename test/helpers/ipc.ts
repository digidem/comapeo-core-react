import { createRequire } from 'node:module'
import path from 'node:path'
import { FastifyController, MapeoManager } from '@comapeo/core'
import {
	closeComapeoCoreClient,
	createComapeoCoreClient,
} from '@comapeo/ipc/client.js'
import { createComapeoCoreServer } from '@comapeo/ipc/server.js'
import { KeyManager } from '@mapeo/crypto'
import Fastify from 'fastify'
import RAM from 'random-access-memory'

const require = createRequire(import.meta.url)

const COMAPEO_CORE_PKG_FOLDER = path.dirname(
	path.dirname(require.resolve('@comapeo/core')),
)
const projectMigrationsFolder = path.join(
	COMAPEO_CORE_PKG_FOLDER,
	'drizzle/project',
)
const clientMigrationsFolder = path.join(
	COMAPEO_CORE_PKG_FOLDER,
	'drizzle/client',
)

export function setupCoreIpc() {
	const { port1, port2 } = new MessageChannel()

	const fastify = Fastify()

	const manager = new MapeoManager({
		rootKey: KeyManager.generateRootKey(),
		dbFolder: ':memory:',
		coreStorage: () => new RAM(),
		projectMigrationsFolder,
		clientMigrationsFolder,
		fastify,
	})

	const server = createComapeoCoreServer(manager, port1)
	const client = createComapeoCoreClient(port2)

	port1.start()
	port2.start()

	const fastifyController = new FastifyController({ fastify })

	return {
		port1,
		port2,
		server,
		client,
		fastifyController,
		cleanup: async () => {
			server.close()
			fastifyController.stop()
			await closeComapeoCoreClient(client)
			port1.close()
			port2.close()
		},
	}
}

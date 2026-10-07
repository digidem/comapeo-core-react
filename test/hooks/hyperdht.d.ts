declare module 'hyperdht' {
	export default class HyperDHT {}
}

declare module 'hyperdht/testnet.js' {
	interface TestnetOpts {
		teardown?: TestnetTearDownFn
		host?: string
		port?: number
	}

	type TestnetTearDownFn = (
		opts: TestnetOpts,
		onFinishTeardown: () => Promise<void>,
	) => void | Promise<void>

	class TestNet {
		nodes: HyperDHT[]
		bootstrap: string[]
		createNode(opts?: object): HyperDHT
		destroy(): Promise<void>
	}

	export default function createTestnet(
		size?: number,
		opts?: TestnetOpts | TestnetTearDownFn,
	): Promise<TestNet>
}

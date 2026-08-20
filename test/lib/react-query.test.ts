/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest'

import {
	baseMutationOptions,
	baseQueryOptions,
} from '../../src/lib/react-query.js'

function errorWithCode(code: string) {
	return Object.assign(new Error(code), { code })
}

describe('baseQueryOptions() retry', () => {
	const { retry } = baseQueryOptions()

	// `RPC_CHANNEL_CLOSED` is what rpc-reflector rejects in-flight calls with
	// when the transport to the backend drops. There is no other transport-level
	// code - `RPC_TRANSPORT_CLOSED` has never existed.
	it('retries a channel-closed rejection a bounded number of times', () => {
		const error = errorWithCode('RPC_CHANNEL_CLOSED')

		expect(retry(0, error)).toBe(true)
		expect(retry(2, error)).toBe(true)
		expect(retry(3, error)).toBe(false)
	})

	// A left project is only usable again after re-joining via an invite, which
	// no amount of retrying brings about
	it('does not retry a left project', () => {
		expect(retry(0, errorWithCode('PROJECT_LEFT'))).toBe(false)
	})

	it('does not retry anything else', () => {
		expect(retry(0, new Error('genuinely broken'))).toBe(false)
		expect(retry(0, errorWithCode('CLIENT_CLOSED'))).toBe(false)
		expect(retry(0, errorWithCode('RPC_TIMEOUT'))).toBe(false)
	})
})

describe('baseMutationOptions()', () => {
	// Re-issuing a write whose response was lost is never safe
	it('never retries', () => {
		expect(baseMutationOptions().retry).toBe(false)
	})
})

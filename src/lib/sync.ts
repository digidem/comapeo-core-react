import type { ComapeoProjectClientApi } from '@comapeo/ipc'
import ensureError from 'ensure-error'

export type SyncState = Awaited<
	ReturnType<ComapeoProjectClientApi['$sync']['getState']>
>

function getDataSyncCountForDevice(
	syncStateForDevice: SyncState['remoteDeviceSyncState'][string],
) {
	const { data } = syncStateForDevice
	return data.want + data.wanted
}

/**
 * Every store that currently has at least one listener. `useSyncStore` caches
 * one store per project client in a `WeakMap`, and with a permanent project
 * client reference (`@comapeo/ipc` v10) a backend restart never produces a
 * fresh store — so the existing ones have to be reachable, and a `WeakMap`
 * cannot be iterated. Stores join on their first listener and leave on their
 * last, so nothing the app has stopped using is retained.
 */
const ACTIVE_SYNC_STORES = new Set<SyncStore>()

/**
 * @internal
 * Re-read sync state on every store that is currently being listened to,
 * discarding the state, the progress baselines and any error left over from the
 * previous backend.
 *
 * Only subscribed stores need this. A store whose last listener has gone drops
 * its error as it unsubscribes and reads from scratch when something subscribes
 * again, so it recovers without being tracked here.
 *
 * Caller contract: the transport owner must have re-sent its event
 * subscriptions to the restarted backend before calling this. Each store
 * re-reads state over the wire, but it does not re-send its own `sync-state`
 * subscription unless attaching the listener failed in the first place.
 */
export function refreshActiveSyncStores() {
	for (const store of ACTIVE_SYNC_STORES) {
		store.refreshAfterBackendRestart()
	}
}

export class SyncStore {
	#project: ComapeoProjectClientApi

	#listeners = new Set<() => void>()
	#isSubscribedInternal = false
	#isListening = false
	#error: Error | null = null
	#state: SyncState | null = null

	// Used for calculating sync progress
	#perDeviceMaxSyncCount = new Map<string, number>()

	constructor(project: ComapeoProjectClientApi) {
		this.#project = project
	}

	subscribe = (listener: () => void) => {
		this.#listeners.add(listener)
		if (!this.#isSubscribedInternal) this.#startSubscription()
		return () => {
			this.#listeners.delete(listener)
			if (this.#listeners.size === 0) this.#stopSubscription()
		}
	}

	getStateSnapshot = (): SyncState | null => {
		if (this.#error) throw this.#error
		return this.#state
	}

	getDataProgressSnapshot = () => {
		if (this.#state === null) {
			return null
		}

		let currentSyncCount = 0
		let totalMaxSyncCount = 0
		let otherEnabledDevicesExist = false

		for (const [deviceId, deviceSyncState] of Object.entries(
			this.#state.remoteDeviceSyncState,
		)) {
			if (deviceSyncState.data.isSyncEnabled) {
				otherEnabledDevicesExist = true
			} else {
				continue
			}

			const existingMaxCount = this.#perDeviceMaxSyncCount.get(deviceId)

			if (typeof existingMaxCount === 'number' && existingMaxCount > 0) {
				currentSyncCount = getDataSyncCountForDevice(deviceSyncState)
				totalMaxSyncCount += existingMaxCount
			}
		}

		if (!otherEnabledDevicesExist) {
			return null
		}

		if (totalMaxSyncCount === 0) {
			return 1
		}

		const ratio = (totalMaxSyncCount - currentSyncCount) / totalMaxSyncCount

		if (ratio <= 0) return 0
		if (ratio >= 1) return 1

		return clamp(ratio, 0.01, 0.99)
	}

	#notifyListeners() {
		for (const listener of this.#listeners) {
			listener()
		}
	}

	#onSyncState = (state: SyncState) => {
		const dataSyncWasEnabled = this.#state
			? this.#state.data.isSyncEnabled
			: false

		// Reset map keeping track of counts used for progress if data sync is toggled
		if (dataSyncWasEnabled !== state.data.isSyncEnabled) {
			this.#perDeviceMaxSyncCount.clear()
		} else {
			// Remove devices from #perDeviceMaxSyncCount that are no longer found in the new sync state
			for (const deviceId of this.#perDeviceMaxSyncCount.keys()) {
				if (!Object.hasOwn(state.remoteDeviceSyncState, deviceId)) {
					this.#perDeviceMaxSyncCount.delete(deviceId)
				}
			}
		}

		for (const [deviceId, stateForDevice] of Object.entries(
			state.remoteDeviceSyncState,
		)) {
			const existingCount = this.#perDeviceMaxSyncCount.get(deviceId)
			const newCount = getDataSyncCountForDevice(stateForDevice)

			if (existingCount === undefined || existingCount < newCount) {
				this.#perDeviceMaxSyncCount.set(deviceId, newCount)
			}
		}

		this.#state = state
		this.#error = null
		this.#notifyListeners()
	}

	#onError = (e: unknown) => {
		this.#error = ensureError(e)
		this.#notifyListeners()
	}

	#connect = () => {
		// A fresh read attempt supersedes whatever the last one failed with
		this.#error = null
		try {
			if (!this.#isListening) {
				this.#project.$sync.on('sync-state', this.#onSyncState)
				this.#isListening = true
			}
			this.#project.$sync
				.getState()
				.then(this.#onSyncState)
				.catch(this.#onError)
		} catch (e) {
			// `on`/`off` throw on a closed project wrapper in @comapeo/ipc v9;
			// v10 references are permanent, so there this only fires if the whole
			// client has been closed.
			this.#onError(e)
		}
	}

	#startSubscription = () => {
		this.#isSubscribedInternal = true
		ACTIVE_SYNC_STORES.add(this)
		this.#connect()
	}

	#stopSubscription = () => {
		this.#isSubscribedInternal = false
		this.#isListening = false
		ACTIVE_SYNC_STORES.delete(this)
		// The error belongs to the subscription that produced it. Holding it
		// past the last listener wedges the store permanently: `getStateSnapshot`
		// throws during render, so an error boundary that remounts the subtree
		// hits the same stale error before `subscribe` can run — and with a
		// permanent project reference the remount is handed back this very store.
		this.#error = null
		try {
			this.#project.$sync.off('sync-state', this.#onSyncState)
		} catch {
			// Runs in React effect cleanup, where a throw from a closed project
			// wrapper (@comapeo/ipc v9) would take down the tree.
		}
	}

	/**
	 * @internal
	 * Discard everything held from the previous backend and read the current
	 * state again. See {@link refreshActiveSyncStores} for the caller contract.
	 */
	refreshAfterBackendRestart = () => {
		// The state goes too, not just the baselines it is measured against:
		// `getDataProgressSnapshot` divides by the largest sync count seen so
		// far, so old state over cleared baselines reads as 1 — "sync complete" —
		// on every restart. With no state it reports `null`, i.e. not known yet.
		this.#state = null
		this.#perDeviceMaxSyncCount.clear()
		// Connect first: it clears the error, so the notification below cannot
		// hand a listener a snapshot that still throws the previous backend's.
		this.#connect()
		this.#notifyListeners()
	}
}

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(value, max))
}

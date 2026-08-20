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
 * one store per project client in a `WeakMap`, and under `@comapeo/ipc` v10 a
 * project client reference is permanent — so a backend restart never produces a
 * fresh store, and there is no way to iterate a `WeakMap` to find the existing
 * ones. Stores join on their first listener and leave on their last, which
 * keeps this from retaining a store the app has stopped using.
 */
const ACTIVE_SYNC_STORES = new Set<SyncStore>()

/**
 * @internal
 * Re-read sync state on every store that is currently being listened to, and
 * clear any error left over from the previous backend. Called as part of the
 * backend-restart recovery.
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
			// A backend restart closes the project wrapper, and @comapeo/ipc
			// versions before the close became a no-op throw from `on`/`off`.
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
		try {
			this.#project.$sync.off('sync-state', this.#onSyncState)
		} catch {
			// Runs in React effect cleanup, where a throw from a closed project
			// wrapper (older @comapeo/ipc) would take down the tree.
		}
	}

	/**
	 * @internal
	 * Drop the state and the sticky error left over from the previous backend
	 * and read the current state again. The event subscription is re-sent by the
	 * transport owner before the restart is announced, so it is only re-attached
	 * here if attaching it failed in the first place.
	 */
	refreshAfterBackendRestart = () => {
		this.#error = null
		// Progress is measured against the largest sync count seen so far, which
		// the new backend knows nothing about.
		this.#perDeviceMaxSyncCount.clear()
		this.#notifyListeners()
		this.#connect()
	}
}

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(value, max))
}

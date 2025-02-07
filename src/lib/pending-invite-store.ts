import type { Invite } from '@comapeo/core/dist/invite-api.js'
import type { MapeoClientApi } from '@comapeo/ipc'

export class PendingInviteStore {
	#api
	#listeners = new Set<() => void>()
	#isSubscribedInternal = false
	#oldestPendingInvite: Invite | null = null
	#pendingInvites = new Map<string, Invite>()
	#abortController: AbortController | null = null

	/////// Start of bound methods

	#handleInviteReceived = (invite: Invite) => {
		this.#pendingInvites.set(invite.inviteId, invite)
		const pending = this.#oldestPendingInvite
		const shouldUpdatePending =
			pending === null || getOldestInvite([pending, invite]) !== pending
		if (shouldUpdatePending) {
			this.#oldestPendingInvite = invite
			this.#notifyListeners()
		}
	}

	#handleInviteRemoved = (invite: Invite) => {
		this.#pendingInvites.delete(invite.inviteId)
		if (invite.inviteId !== this.#oldestPendingInvite?.inviteId) {
			return
		}
		const pending = [...this.#pendingInvites.values()]
		if (isNonEmptyArray(pending)) {
			this.#oldestPendingInvite = getOldestInvite(pending)
		} else {
			this.#oldestPendingInvite = null
		}
		this.#notifyListeners()
	}

	subscribe = (listener: () => void) => {
		this.#listeners.add(listener)
		if (!this.#isSubscribedInternal) this.#startSubscription()
		return () => {
			this.#listeners.delete(listener)
			if (this.#listeners.size === 0) this.#stopSubscription()
		}
	}

	getSnapshot = () => {
		if (!this.#isSubscribedInternal) {
			throw new Error(
				'At least one listener must be subscribed to get the snapshot',
			)
		}
		return this.#oldestPendingInvite
	}

	/////// End of bound methods

	constructor(mapeoClientApi: MapeoClientApi) {
		this.#api = mapeoClientApi
	}

	#startSubscription() {
		this.#isSubscribedInternal = true
		this.#pendingInvites.clear()
		this.#oldestPendingInvite = null
		this.#notifyListeners()
		this.#abortController = new AbortController()
		const { signal } = this.#abortController
		this.#api.invite.on('invite-received', this.#handleInviteReceived)
		this.#api.invite.on('invite-removed', this.#handleInviteRemoved)
		this.#api.invite
			.getPending()
			.then((invites) => {
				if (signal.aborted) return
				for (const invite of invites) {
					this.#pendingInvites.set(invite.inviteId, invite)
				}
			})
			.catch(noop)
	}

	#stopSubscription() {
		this.#isSubscribedInternal = false
		this.#abortController?.abort()
		this.#abortController = null
		this.#api.invite.off('invite-received', this.#handleInviteReceived)
		this.#api.invite.off('invite-removed', this.#handleInviteRemoved)
	}

	#notifyListeners() {
		for (const listener of this.#listeners) {
			listener()
		}
	}
}

type NonEmptyArray<T> = [T, ...Array<T>]

function isNonEmptyArray<T>(arr: Array<T>): arr is NonEmptyArray<T> {
	return arr.length > 0
}

function getOldestInvite(invites: NonEmptyArray<Invite>): Invite {
	let oldest: Invite = invites[0]
	for (const invite of invites) {
		if (oldest === invite) continue
		if (invite.receivedAt < oldest.receivedAt) {
			oldest = invite
		} else if (
			// If two invites are received at the same time, deterministically select one based on inviteId
			invite.receivedAt === oldest.receivedAt &&
			invite.inviteId < oldest.inviteId
		) {
			oldest = invite
		}
	}
	return oldest
}

function noop() {}

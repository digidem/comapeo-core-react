import type { MapeoClientApi } from '@comapeo/ipc'
import { queryOptions } from '@tanstack/react-query'

import { ROOT_QUERY_KEY } from '../constants.js'

export const INVITES_QUERY_KEYS = {
	invites: () => {
		return [ROOT_QUERY_KEY, 'invites'] as const
	},
	pendingInvites: () => {
		return [ROOT_QUERY_KEY, 'invites', { status: 'pending' }] as const
	},
}

export function pendingInvitesQueryOptions({
	clientApi,
}: {
	clientApi: MapeoClientApi
}) {
	return queryOptions({
		queryKey: INVITES_QUERY_KEYS.pendingInvites(),
		queryFn: () => {
			return clientApi.invite.getPending()
		},
	})
}

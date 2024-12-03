import type { MapeoClientApi } from '@comapeo/ipc'
import { queryOptions } from '@tanstack/react-query'

import { BASE_QUERY_OPTIONS, ROOT_QUERY_KEY } from './shared'

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
		...BASE_QUERY_OPTIONS,
		queryKey: INVITES_QUERY_KEYS.pendingInvites(),
		queryFn: async () => {
			return clientApi.invite.getPending()
		},
	})
}

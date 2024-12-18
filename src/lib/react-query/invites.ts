import type { MapeoClientApi } from '@comapeo/ipc'
import { queryOptions } from '@tanstack/react-query'

import { baseQueryOptions, ROOT_QUERY_KEY } from './shared.js'

export function getInvitesQueryKey() {
	return [ROOT_QUERY_KEY, 'invites'] as const
}

export function getPendingInvitesQueryKey() {
	return [ROOT_QUERY_KEY, 'invites', { status: 'pending' }] as const
}

export function pendingInvitesQueryOptions({
	clientApi,
}: {
	clientApi: MapeoClientApi
}) {
	return queryOptions({
		...baseQueryOptions(),
		queryKey: getPendingInvitesQueryKey(),
		queryFn: async () => {
			return clientApi.invite.getPending()
		},
	})
}

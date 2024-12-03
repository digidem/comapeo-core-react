import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import {
	INVITES_QUERY_KEYS,
	pendingInvitesQueryOptions,
} from '../lib/react-query/invites'
import { useClientApi } from './client'

export function usePendingInvites() {
	const queryClient = useQueryClient()
	const clientApi = useClientApi()

	useEffect(() => {
		function onInviteChange() {
			queryClient.invalidateQueries({
				queryKey: INVITES_QUERY_KEYS.invites(),
			})
		}

		clientApi.invite.on('invite-received', onInviteChange)
		clientApi.invite.on('invite-removed', onInviteChange)

		return () => {
			clientApi.invite.off('invite-received', onInviteChange)
			clientApi.invite.off('invite-removed', onInviteChange)
		}
	}, [clientApi.invite, queryClient])

	const { data, status, isFetching } = useQuery(
		pendingInvitesQueryOptions({ clientApi }),
	)

	// Cursed but needed for type narrowing to work
	return status === 'success'
		? {
				data,
				status,
				isFetching,
			}
		: {
				data,
				status,
				isFetching,
			}
}

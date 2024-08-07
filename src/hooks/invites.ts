import type { MapeoClientApi } from '@mapeo/ipc'
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'

import { useClientApi } from './client-api.js'

const INVITE = 'invite'

function pendingInvitesQueryKey() {
  return [INVITE] as const
}

export function pendingInvitesQueryOptions(opts: {
  clientApi: MapeoClientApi
}) {
  return queryOptions({
    queryKey: pendingInvitesQueryKey(),
    queryFn: () => {
      return opts.clientApi.invite.getPending()
    },
  })
}

export function useSuspensefulPendingInvites() {
  const clientApi = useClientApi()
  return useSuspenseQuery(pendingInvitesQueryOptions({ clientApi }))
}

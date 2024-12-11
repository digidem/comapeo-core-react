import type { MapeoClientApi } from '@comapeo/ipc'
import { queryOptions } from '@tanstack/react-query'

import { baseQueryOptions, ROOT_QUERY_KEY } from './shared'

function getDeviceInfoQueryKey() {
	return [ROOT_QUERY_KEY, 'device_info'] as const
}

export function deviceInfoQueryOptions({
	clientApi,
}: {
	clientApi: MapeoClientApi
}) {
	return queryOptions({
		...baseQueryOptions(),
		queryKey: getDeviceInfoQueryKey(),
		queryFn: async () => {
			return clientApi.getDeviceInfo()
		},
	})
}

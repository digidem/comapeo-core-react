import type { MapeoClientApi } from '@comapeo/ipc'
import { queryOptions } from '@tanstack/react-query'

import { BASE_QUERY_OPTIONS, ROOT_QUERY_KEY } from './shared'

export const DEVICE_INFO_QUERY_KEYS = {
	deviceInfo: () => {
		return [ROOT_QUERY_KEY, 'device_info'] as const
	},
}

export function deviceInfoQueryOptions({
	clientApi,
}: {
	clientApi: MapeoClientApi
}) {
	return queryOptions({
		...BASE_QUERY_OPTIONS,
		queryKey: DEVICE_INFO_QUERY_KEYS.deviceInfo(),
		queryFn: async () => {
			return clientApi.getDeviceInfo()
		},
	})
}

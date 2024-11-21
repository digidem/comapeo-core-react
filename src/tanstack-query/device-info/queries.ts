import type { MapeoClientApi } from '@comapeo/ipc'
import { queryOptions } from '@tanstack/react-query'

import { ROOT_QUERY_KEY } from '../constants'

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
		queryKey: DEVICE_INFO_QUERY_KEYS.deviceInfo(),
		queryFn: () => {
			return clientApi.getDeviceInfo()
		},
	})
}

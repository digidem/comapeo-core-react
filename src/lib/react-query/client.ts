import type { MapeoClientApi } from '@comapeo/ipc'
import { queryOptions } from '@tanstack/react-query'

import { baseQueryOptions, ROOT_QUERY_KEY } from './shared'

export function getClientQueryKey() {
	return [ROOT_QUERY_KEY, 'client'] as const
}

export function getDeviceInfoQueryKey() {
	return [ROOT_QUERY_KEY, 'client', 'device_info'] as const
}

export function getIsArchiveDeviceQueryKey() {
	return [ROOT_QUERY_KEY, 'client', 'is_archive_device'] as const
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

export function isArchiveDeviceQueryOptions({
	clientApi,
}: {
	clientApi: MapeoClientApi
}) {
	return queryOptions({
		...baseQueryOptions(),
		queryKey: getIsArchiveDeviceQueryKey(),
		queryFn: async () => {
			return clientApi.getIsArchiveDevice()
		},
	})
}

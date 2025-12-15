import type { MapeoClientApi } from '@comapeo/ipc' with {
	'resolution-mode': 'import',
}
import type { DeviceInfo } from '@comapeo/schema' with {
	'resolution-mode': 'import',
}
import {
	queryOptions,
	type MutationOptions,
	type QueryClient,
} from '@tanstack/react-query'

import { getProjectsQueryKey } from './projects.js'
import {
	baseMutationOptions,
	baseQueryOptions,
	ROOT_QUERY_KEY,
} from './shared.js'

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

export function setOwnDeviceInfoMutationOptions({
	clientApi,
	queryClient,
}: {
	clientApi: MapeoClientApi
	queryClient: QueryClient
}) {
	return {
		...baseMutationOptions(),
		mutationFn: async ({ name, deviceType }) => {
			return clientApi.setDeviceInfo({ name, deviceType })
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: getDeviceInfoQueryKey(),
			})
			queryClient.invalidateQueries({
				queryKey: getProjectsQueryKey(),
			})
		},
	} satisfies MutationOptions<
		void,
		Error,
		{ name: string; deviceType: DeviceInfo['deviceType'] }
	>
}

export function setIsArchiveDeviceMutationOptions({
	clientApi,
	queryClient,
}: {
	clientApi: MapeoClientApi
	queryClient: QueryClient
}) {
	return {
		...baseMutationOptions(),
		mutationFn: async ({ isArchiveDevice }) => {
			return clientApi.setIsArchiveDevice(isArchiveDevice)
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: getIsArchiveDeviceQueryKey(),
			})
		},
	} satisfies MutationOptions<void, Error, { isArchiveDevice: boolean }>
}

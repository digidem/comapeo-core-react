import type { DeviceInfo } from '@comapeo/core/schema.js'
import type { MapeoClientApi } from '@comapeo/ipc'
import {
	useMutation,
	UseMutationResult,
	useQueryClient,
	useSuspenseQuery,
	UseSuspenseQueryResult,
} from '@tanstack/react-query'
import { useContext } from 'react'

import { ClientApiContext } from '../contexts/ClientApi.js'
import {
	baseMutationOptions,
	baseQueryOptions,
	getDeviceInfoQueryKey,
	getIsArchiveDeviceQueryKey,
	getProjectsQueryKey,
} from '../lib/react-query.js'

/**
 * Access a client API instance. If a ClientApiContext provider is not
 * set up, it will throw an error.
 *
 * @returns Client API instance
 *
 * @example
 * ```tsx
 * function ClientExample() {
 *   return (
 *     // Creation of clientApi omitted for brevity
 *     <ClientApiContext.Provider clientApi={clientApi}>
 *       <ComponentThatUsesClient />
 *     </ClientApiContext.Provider>
 *   )
 * }
 *
 * function ComponentThatUsesClient() {
 *   const clientApi = useClientApi()
 *
 *   // Rest omitted for brevity.
 * }
 * ```
 *
 */
export function useClientApi(): MapeoClientApi {
	const clientApi = useContext(ClientApiContext)

	if (!clientApi) {
		throw new Error(
			'No client API set. Make sure you set up the ClientApiContext provider properly',
		)
	}

	return clientApi
}

/**
 * Retrieve info about the current device.
 *
 * @example
 * ```tsx
 * function DeviceInfoExample() {
 *   const { data } = useDeviceInfo()
 * }
 * ```
 */
export function useOwnDeviceInfo(): Pick<
	UseSuspenseQueryResult<Awaited<ReturnType<MapeoClientApi['getDeviceInfo']>>>,
	'data' | 'error' | 'isRefetching'
> {
	const clientApi = useClientApi()

	const { data, error, isRefetching } = useSuspenseQuery({
		...baseQueryOptions(),
		queryKey: getDeviceInfoQueryKey(),
		queryFn: async () => {
			return clientApi.getDeviceInfo()
		},
	})

	return { data, error, isRefetching }
}

/**
 * Retrieve whether the current device is an archive device or not.
 *
 * @example
 * ```tsx
 * function IsArchiveDeviceExample() {
 *   const { data } = useIsArchiveDevice()
 * }
 * ```
 */
export function useIsArchiveDevice(): Pick<
	UseSuspenseQueryResult<
		Awaited<ReturnType<MapeoClientApi['getIsArchiveDevice']>>
	>,
	'data' | 'error' | 'isRefetching'
> {
	const clientApi = useClientApi()

	const { data, error, isRefetching } = useSuspenseQuery({
		...baseQueryOptions(),
		queryKey: getIsArchiveDeviceQueryKey(),
		queryFn: async () => {
			return clientApi.getIsArchiveDevice()
		},
	})

	return { data, error, isRefetching }
}

/**
 * Update the device info for the current device.
 */
export function useSetOwnDeviceInfo(): UseMutationResult<
	void,
	Error,
	{ name: string; deviceType: DeviceInfo['deviceType'] }
> {
	const queryClient = useQueryClient()
	const clientApi = useClientApi()

	return useMutation({
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
	})
}

/**
 * Set or unset the current device as an archive device.
 */
export function useSetIsArchiveDevice(): UseMutationResult<
	void,
	Error,
	{ isArchiveDevice: boolean }
> {
	const queryClient = useQueryClient()
	const clientApi = useClientApi()

	return useMutation({
		...baseMutationOptions(),
		mutationFn: async ({ isArchiveDevice }) => {
			return clientApi.setIsArchiveDevice(isArchiveDevice)
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: getIsArchiveDeviceQueryKey(),
			})
		},
	})
}

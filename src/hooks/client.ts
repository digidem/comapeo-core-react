import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from '@tanstack/react-query'
import { useContext } from 'react'

import { ClientApiContext } from '../contexts/ClientApi.js'
import {
	deviceInfoQueryOptions,
	isArchiveDeviceQueryOptions,
	setIsArchiveDeviceMutationOptions,
	setOwnDeviceInfoMutationOptions,
} from '../lib/react-query/client.js'

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
export function useClientApi() {
	const contextValue = useContext(ClientApiContext)

	if (!contextValue) {
		throw new Error(
			'No client API set. Make sure you set up the ClientApiContext provider properly',
		)
	}

	return contextValue.clientApi
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
export function useOwnDeviceInfo() {
	const clientApi = useClientApi()

	const { data, error, isRefetching } = useSuspenseQuery(
		deviceInfoQueryOptions({ clientApi }),
	)

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
export function useIsArchiveDevice() {
	const clientApi = useClientApi()

	const { data, error, isRefetching } = useSuspenseQuery(
		isArchiveDeviceQueryOptions({ clientApi }),
	)

	return { data, error, isRefetching }
}

/**
 * Update the device info for the current device.
 */
export function useSetOwnDeviceInfo() {
	const queryClient = useQueryClient()
	const clientApi = useClientApi()

	const { mutate, status, reset } = useMutation(
		setOwnDeviceInfoMutationOptions({ clientApi, queryClient }),
	)

	return { mutate, reset, status }
}

/**
 * Set or unset the current device as an archive device.
 */
export function useSetIsArchiveDevice() {
	const queryClient = useQueryClient()
	const clientApi = useClientApi()

	const { mutate, status, reset } = useMutation(
		setIsArchiveDeviceMutationOptions({ clientApi, queryClient }),
	)

	return { mutate, reset, status }
}

import { DeviceInfo } from '@comapeo/schema'
import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from '@tanstack/react-query'
import { useContext } from 'react'

import { ClientApiContext } from '../contexts/ClientApi.js'
import {
	deviceInfoQueryOptions,
	getDeviceInfoQueryKey,
	getIsArchiveDeviceQueryKey,
	isArchiveDeviceQueryOptions,
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
 *
 * @example
 * ```tsx
 * function Example() {
 *   const { mutate, status } = useSetOwnDeviceInfo()
 *
 *   return (
 *     <button
 *       className={status === 'pending' ? 'loading' : undefined}
 * 		 onClick={() => {
 * 		   mutate({
 * 		     name: 'Bob',
 * 		     deviceType: 'mobile',
 * 		   })
 * 		 }}
 * 	   >
 * 	     Press Me!
 *     </button>
 *   )
 * }
 * ```
 */
export function useSetOwnDeviceInfo() {
	const queryClient = useQueryClient()
	const clientApi = useClientApi()

	const { mutate, status, reset } = useMutation({
		mutationFn: async ({
			name,
			deviceType,
		}: {
			name: string
			deviceType: DeviceInfo['deviceType']
		}) => {
			return clientApi.setDeviceInfo({ name, deviceType })
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: getDeviceInfoQueryKey(),
			})
		},
	})

	return {
		mutate,
		reset,
		status,
	}
}

export function useSetIsArchiveDevice() {
	const queryClient = useQueryClient()
	const clientApi = useClientApi()

	const { mutate, status, reset } = useMutation({
		mutationFn: async ({ isArchiveDevice }: { isArchiveDevice: boolean }) => {
			return clientApi.setIsArchiveDevice(isArchiveDevice)
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: getIsArchiveDeviceQueryKey(),
			})
		},
	})

	return {
		mutate,
		reset,
		status,
	}
}

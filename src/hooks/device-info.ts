import { useSuspenseQuery } from '@tanstack/react-query'

import { deviceInfoQueryOptions } from '../lib/react-query/device-info'
import { useClientApi } from './client'

/**
 * Retrieve info about the current device.
 *
 * @example
 * ```tsx
 * function DeviceInfoExample() {
 *   const { data, isRefetching } = useDeviceInfo()
 * }
 * ```
 *
 */
export function useOwnDeviceInfo() {
	const clientApi = useClientApi()

	const { data, isRefetching } = useSuspenseQuery(
		deviceInfoQueryOptions({ clientApi }),
	)

	return { data, isRefetching }
}

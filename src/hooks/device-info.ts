import { useSuspenseQuery } from '@tanstack/react-query'

import { deviceInfoQueryOptions } from '../lib/react-query/device-info'
import { useClientApi } from './client'

export function useOwnDeviceId() {
	const clientApi = useClientApi()

	const { data, isRefetching } = useSuspenseQuery(
		deviceInfoQueryOptions({ clientApi }),
	)

	return { data, isRefetching }
}

import { useSuspenseQuery } from '@tanstack/react-query'

import { mapStyleJsonUrlQueryOptions } from '../lib/react-query/maps'
import { useClientApi } from './client'

export function useMapStyleUrl({
	refreshToken,
}: {
	refreshToken?: string
} = {}) {
	const clientApi = useClientApi()

	const { data, isRefetching } = useSuspenseQuery(
		mapStyleJsonUrlQueryOptions({ clientApi, refreshToken }),
	)

	return { data, isRefetching }
}

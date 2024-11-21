import type { MapeoClientApi } from '@comapeo/ipc'
import { queryOptions } from '@tanstack/react-query'

import { ROOT_QUERY_KEY } from '../constants'

export const MAPS_QUERY_KEYS = {
	maps: () => {
		return [ROOT_QUERY_KEY, 'maps'] as const
	},
	styleJsonUrl: ({ refreshToken }: { refreshToken?: string }) => {
		return [ROOT_QUERY_KEY, 'maps', 'stylejson_url', { refreshToken }] as const
	},
}

export function mapStyleJsonUrlQueryOptions({
	clientApi,
	refreshToken,
}: {
	clientApi: MapeoClientApi
	refreshToken?: string
}) {
	return queryOptions({
		queryKey: MAPS_QUERY_KEYS.styleJsonUrl({ refreshToken }),
		queryFn: async () => {
			const result = await clientApi.getMapStyleJsonUrl()
			return refreshToken ? result + `?refresh_token=${refreshToken}` : result
		},
	})
}

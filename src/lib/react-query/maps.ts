import type { MapeoClientApi } from '@comapeo/ipc' with { 'resolution-mode': 'import' }
import { queryOptions } from '@tanstack/react-query'

import { baseQueryOptions, ROOT_QUERY_KEY } from './shared.js'

export function getMapsQueryKey() {
	return [ROOT_QUERY_KEY, 'maps'] as const
}

export function getStyleJsonUrlQueryKey({
	refreshToken,
}: {
	refreshToken?: string
}) {
	return [ROOT_QUERY_KEY, 'maps', 'stylejson_url', { refreshToken }] as const
}

export function mapStyleJsonUrlQueryOptions({
	clientApi,
	refreshToken,
}: {
	clientApi: MapeoClientApi
	refreshToken?: string
}) {
	return queryOptions({
		...baseQueryOptions(),
		queryKey: getStyleJsonUrlQueryKey({ refreshToken }),
		queryFn: async () => {
			const result = await clientApi.getMapStyleJsonUrl()

			if (!refreshToken) return result

			const u = new URL(result)
			u.searchParams.set('refresh_token', refreshToken)
			return u.href
		},
	})
}

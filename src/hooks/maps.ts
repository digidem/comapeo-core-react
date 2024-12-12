import { useSuspenseQuery } from '@tanstack/react-query'

import { mapStyleJsonUrlQueryOptions } from '../lib/react-query/maps'
import { useClientApi } from './client'

/**
 * Get a URL that points to a StyleJSON resource served by the embedded HTTP server.
 *
 * If `opts.refreshToken` is specified, it will be appended to the returned URL as a search param. This is useful for forcing cache busting
 * due to hidden internal details by consuming components (e.g. map component from MapLibre).
 *
 * @param {Object} opts
 * @param {string} opts.refreshToken String to append to the returned value as a search param
 *
 * @example
 * ```tsx
 * function ExampleWithoutRefreshToken() {
 *   const { data, isRefetching } = useMapStyleUrl()
 *
 *   console.log(data) // logs something like 'http://localhost:...'
 * }
 * ```
 *
 * ```tsx
 * function ExampleWithRefreshToken() {
 *   const [refreshToken] = useState('foo')
 *   const { data, isRefetching } = useMapStyleUrl({ refreshToken })
 *
 *   console.log(data) // logs something like 'http://localhost:...?refresh_token=foo'
 * }
 * ```
 */
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

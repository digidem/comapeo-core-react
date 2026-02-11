import type { MapeoClientApi } from '@comapeo/ipc' with {
	'resolution-mode': 'import',
}
import { CUSTOM_MAP_ID } from '@comapeo/map-server'
import { queryOptions, type UseMutationOptions } from '@tanstack/react-query'

import type { MapServerApi } from '../../contexts/MapServer.js'
import type {
	ReceivedMapSharesStore,
	SentMapSharesStore,
} from '../map-shares-stores.js'
import {
	baseMutationOptions,
	baseQueryOptions,
	ROOT_QUERY_KEY,
} from './shared.js'

// ============================================
// QUERY KEYS
// ============================================

export function getMapsQueryKey() {
	return [ROOT_QUERY_KEY, 'maps'] as const
}

export function getMapSharesQueryKey() {
	return [ROOT_QUERY_KEY, 'maps', 'shares'] as const
}

export function getMapSharesByIdQueryKey({ shareId }: { shareId: string }) {
	return [ROOT_QUERY_KEY, 'maps', 'shares', shareId] as const
}

export function getStyleJsonUrlQueryKey({
	refreshToken,
	mapId,
}: {
	refreshToken?: string
	mapId: string
}) {
	return [
		ROOT_QUERY_KEY,
		'maps',
		mapId,
		'stylejson_url',
		{ refreshToken },
	] as const
}

// ============================================
// QUERY OPTIONS
// ============================================

export function mapStyleJsonUrlQueryOptions({
	mapServerApi,
	refreshToken,
	mapId = CUSTOM_MAP_ID,
}: {
	mapServerApi: MapServerApi
	refreshToken?: string
	mapId?: string
}) {
	return queryOptions({
		...baseQueryOptions(),
		queryKey: getStyleJsonUrlQueryKey({ mapId, refreshToken }),
		queryFn: async () => {
			const result = await mapServerApi.getMapStyleJsonUrl(mapId)

			if (!refreshToken) return result

			const u = new URL(result)
			u.searchParams.set('refresh_token', refreshToken)
			return u.href
		},
	})
}

/**
 * Mutation options for actions on sent map shares
 */
export function mapSharesMutationOptions<
	TAction extends
		| SentMapSharesStore['actions'][keyof SentMapSharesStore['actions']]
		| keyof ReceivedMapSharesStore['actions'][keyof ReceivedMapSharesStore['actions']],
>(
	options:
		| {
				action: Exclude<TAction, SentMapSharesStore['actions']['createAndSend']>
		  }
		| {
				action: SentMapSharesStore['actions']['createAndSend']
				projectId: string
		  },
): UseMutationOptions<
	ReturnType<TAction>,
	Error,
	TAction extends SentMapSharesStore['actions']['createAndSend']
		? Parameters<TAction>[0]
		: Omit<Parameters<TAction>[0], 'projectId'>
> {
	return {
		...baseMutationOptions(),
		mutationFn: async (
			variables: TAction extends SentMapSharesStore['actions']['createAndSend']
				? Parameters<TAction>[0]
				: Omit<Parameters<TAction>[0], 'projectId'>,
		) => {
			// For consistency with other hooks, we use `projectId` as a parameter of
			// the hook, rather than a parameter of the mutate function.
			const actionOptions =
				'projectId' in options
					? { ...variables, projectId: options.projectId }
					: variables
			return options.action(
				// @ts-expect-error - TS can't help us here
				actionOptions,
			) as ReturnType<TAction>
		},
	}
}

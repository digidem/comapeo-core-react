import { CUSTOM_MAP_ID, DEFAULT_MAP_ID } from '@comapeo/map-server/constants.js'
import {
	queryOptions,
	type QueryClient,
	type UseMutationOptions,
} from '@tanstack/react-query'

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

// Expo's file-system File type is close to the standard File type, so for our
// import function we accept an object with the compatible properties and
// methods, and for the expo File, which can represent a file that does not yet
// exists, we type the `exists` property so that we can check that.
type CompatFile = Omit<File, 'lastModified' | 'webkitRelativePath'>
type ExpoFileDuckType = CompatFile & {
	exists: boolean
}

// ============================================
// QUERY KEYS
// ============================================

const MAPS_ROOT_QUERY_KEY = [ROOT_QUERY_KEY, 'maps'] as const

export function getMapQueryKey({ mapId }: { mapId: string }) {
	return [...MAPS_ROOT_QUERY_KEY, mapId] as const
}

export function getStyleJsonUrlQueryKey({ mapId }: { mapId: string }) {
	return [...getMapQueryKey({ mapId }), 'stylejson_url'] as const
}

// ============================================
// QUERY OPTIONS
// ============================================

export function mapStyleJsonUrlQueryOptions({
	mapServerApi,
	mapId = DEFAULT_MAP_ID,
}: {
	mapServerApi: MapServerApi
	mapId?: string
}) {
	if (mapId !== DEFAULT_MAP_ID) {
		throw new Error('Custom map IDs are not supported yet')
	}

	return queryOptions({
		...baseQueryOptions(),
		queryKey: getStyleJsonUrlQueryKey({ mapId }),
		queryFn: async () => {
			const result = await mapServerApi.getMapStyleJsonUrl(mapId)
			const u = new URL(result)
			// This ensures that every time this query is refetched, it will have a different search param, forcing the map to reload.
			u.searchParams.set('refresh_token', Date.now().toString())
			return u.href
		},
		// Keep this cached until the cache is manually invalidated by a map upload
		staleTime: Infinity,
		gcTime: Infinity,
	})
}

export function mapInfoQueryOptions({
	mapServerApi,
	mapId = DEFAULT_MAP_ID,
}: {
	mapServerApi: MapServerApi
	mapId?: string
}) {
	if (mapId !== CUSTOM_MAP_ID) {
		throw new Error('Only custom map ID is currently supported')
	}
	return queryOptions({
		...baseQueryOptions(),
		queryKey: [...getMapQueryKey({ mapId }), 'info'] as const,
		queryFn: async () => {
			return mapServerApi.get(`maps/${mapId}/info`).json()
		},
		// Keep this cached until the cache is manually invalidated by a map upload
		staleTime: Infinity,
		gcTime: Infinity,
	})
}

// ============================================
// MUTATION OPTIONS
// ============================================

export function mapImportMutationOptions({
	mapServerApi,
	queryClient,
}: {
	mapServerApi: MapServerApi
	queryClient: QueryClient
}) {
	// TODO: Support importing to custom map IDs, to support multiple maps.
	const mapId = CUSTOM_MAP_ID
	return {
		...baseMutationOptions(),
		mutationFn: async ({ file }: { file: File | ExpoFileDuckType }) => {
			if ('exists' in file && !file.exists) {
				throw new Error('File does not exist or is not accessible')
			}
			return mapServerApi.put(`maps/${mapId}`, {
				body: file,
				headers: {
					'Content-Type': 'application/octet-stream',
				},
			})
		},
		onSuccess: async () => {
			// Invalidate queries for this map and the default map (which internally
			// redirects to custom) so that they will be refetched with the new map data.
			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: getMapQueryKey({ mapId }),
				}),
				queryClient.invalidateQueries({
					queryKey: getMapQueryKey({ mapId: DEFAULT_MAP_ID }),
				}),
			])
		},
	}
}

export function mapRemoveMutationOptions({
	mapServerApi,
	queryClient,
}: {
	mapServerApi: MapServerApi
	queryClient: QueryClient
}) {
	// TODO: Support removing from custom map IDs, to support multiple maps.
	const mapId = CUSTOM_MAP_ID
	return {
		...baseMutationOptions(),
		mutationFn: async () => {
			return mapServerApi.delete(`maps/${mapId}`)
		},
		onSuccess: async () => {
			// Invalidate queries for this map and the default map (which internally
			// redirects to custom) so that they will be refetched with the new map data.
			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: getMapQueryKey({ mapId }),
				}),
				queryClient.invalidateQueries({
					queryKey: getMapQueryKey({ mapId: DEFAULT_MAP_ID }),
				}),
			])
		},
	}
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

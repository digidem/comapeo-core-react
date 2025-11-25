/* eslint-disable @typescript-eslint/no-unused-vars */
import type {
	MapeoClientApi,
	MapeoProjectApi,
} from '@comapeo/ipc' with { 'resolution-mode': 'import' }
import {
	queryOptions,
	type QueryClient,
	type UseMutationOptions,
} from '@tanstack/react-query'

import {
	baseMutationOptions,
	baseQueryOptions,
	ROOT_QUERY_KEY,
} from './shared.js'

type MapShareState =
	/** Map share has been received and is awaiting a response */
	| 'pending'
	/** Map share has been rejected */
	| 'rejected'
	/** Map share is currently being downloaded */
	| 'downloading'
	/** Map share has been cancelled by the sharer */
	| 'cancelled'
	/** Map has been downloaded */
	| 'completed'
	/** An error occurred while receiving the map share */
	| 'error'

type MapShareBase = {
	/** The ID of the device that sent the map share */
	senderDeviceId: string
	/** The name of the device that sent the map share */
	senderDeviceName: string
	/** The ID of the map share */
	shareId: string
	/** The name of the map being shared */
	mapName: string
	/** The ID of the map being shared */
	mapId: string
	/** The timestamp when the map share invite was received */
	receivedAt: number
	/** The bounding box of the map data being shared */
	bounds: [number, number, number, number]
	/** The minimum zoom level of the map data being shared */
	minzoom: number
	/** The maximum zoom level of the map data being shared */
	maxzoom: number
	/** Estimated size of the map data being shared in bytes */
	estimatedSizeBytes: number
}

type MapShare =
	| (MapShareBase & {
			state: Exclude<MapShareState, 'downloading' | 'error'>
	  })
	| {
			state: 'downloading'
			/** Total bytes downloaded so far (compare with estimatedSizeBytes for progress) */
			bytesDownloaded: number
	  }
	| {
			state: 'error'
			/** Error that occurred while receiving the map share */
			error: Error
	  }

const MOCK_MAP_SHARE = {
	senderDeviceId: 'device-123',
	senderDeviceName: 'Device 123',
	shareId: 'share-456',
	mapName: 'Sample Map',
	mapId: 'map-789',
	receivedAt: Date.now(),
	bounds: [0, 0, 10, 10],
	minzoom: 0,
	maxzoom: 14,
	estimatedSizeBytes: 1024 * 1024,
	state: 'pending' as const,
} satisfies MapShare

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

export function getMapSharesQueryOptions({
	clientApi,
}: {
	clientApi: MapeoClientApi
}) {
	return queryOptions({
		...baseQueryOptions(),
		queryKey: getMapSharesQueryKey(),
		queryFn: async (): Promise<Array<MapShare>> => {
			return [MOCK_MAP_SHARE]
		},
	})
}

export function getMapShareByIdQueryOptions({
	clientApi,
	shareId,
}: {
	clientApi: MapeoClientApi
	shareId: string
}) {
	return queryOptions({
		...baseQueryOptions(),
		queryKey: getMapSharesByIdQueryKey({ shareId }),
		queryFn: async (): Promise<MapShare> => {
			return MOCK_MAP_SHARE
		},
	})
}

export function acceptMapShareMutationOptions({
	clientApi,
	queryClient,
}: {
	clientApi: MapeoClientApi
	queryClient: QueryClient
}) {
	return {
		...baseMutationOptions(),
		mutationFn: async ({ shareId }) => {
			await new Promise((res) => setTimeout(res, 1000))
			console.log('Accepted map share', shareId)
		},
	} satisfies UseMutationOptions<void, Error, { shareId: string }>
}

export function rejectMapShareMutationOptions({
	clientApi,
	queryClient,
}: {
	clientApi: MapeoClientApi
	queryClient: QueryClient
}) {
	return {
		...baseMutationOptions(),
		mutationFn: async ({ shareId }) => {
			await new Promise((res) => setTimeout(res, 1000))
			console.log('Rejected map share', shareId)
		},
	} satisfies UseMutationOptions<void, Error, { shareId: string }>
}

export function sendMapShareMutationOptions({
	projectApi,
	projectId,
	queryClient,
}: {
	projectApi: MapeoProjectApi
	projectId: string
	queryClient: QueryClient
}) {
	return {
		...baseMutationOptions(),
		mutationFn: async ({ deviceId, mapId }) => {
			await new Promise((res) => setTimeout(res, 1000))
			console.log(
				`Sent map share for map ${mapId} to device ${deviceId} on project ${projectId}`,
			)
			const outcomes: Array<'ACCEPT' | 'REJECT' | 'ALREADY'> = [
				'ACCEPT',
				'REJECT',
				'ALREADY',
			]
			return outcomes[Math.floor(Math.random() * outcomes.length)] || 'ACCEPT'
		},
	} satisfies UseMutationOptions<
		'ACCEPT' | 'REJECT' | 'ALREADY',
		Error,
		{
			deviceId: string
			mapId: string
		}
	>
}

export function requestCancelMapShareMutationOptions({
	projectApi,
	queryClient,
}: {
	projectApi: MapeoProjectApi
	queryClient: QueryClient
}) {
	return {
		...baseMutationOptions(),
		mutationFn: async ({ shareId }) => {
			await new Promise((res) => setTimeout(res, 1000))
			console.log('Requested cancellation of map share', shareId)
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: getMapSharesQueryKey(),
			})
		},
	} satisfies UseMutationOptions<void, Error, { shareId: string }>
}

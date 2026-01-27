/**
 * Types for map sharing functionality, matching the @comapeo/map-server HTTP API.
 */

/**
 * State of a map share from the sender's perspective. Re-exported from `@comapeo/map-server`.
 */
export type { MapShareState } from '@comapeo/map-server'

// Re-export other types from @comapeo/map-server for convenience
export type {
	MapShareStateUpdate,
	DownloadState,
	DownloadStateUpdate,
	MapInfo,
	MapShareCreateParams,
	MapShareDeclineParams,
	DownloadCreateParams,
} from '@comapeo/map-server'

/**
 * Status values for a map share (sender-side perspective)
 */
export type MapShareStatus =
	| 'pending'
	| 'declined'
	| 'downloading'
	| 'canceled'
	| 'aborted'
	| 'completed'
	| 'error'

/**
 * Status values for a received map share (receiver-side perspective)
 */
export type ReceivedMapShareStatus =
	| 'pending'
	| 'rejected'
	| 'downloading'
	| 'cancelled'
	| 'aborted'
	| 'completed'
	| 'error'

/**
 * Base properties for a received map share offer.
 * This is the data that comes via RPC event when a sender shares a map.
 */
export type ReceivedMapShareOffer = {
	/** The ID of the device that sent the map share */
	senderDeviceId: string
	/** The name of the device that sent the map share */
	senderDeviceName: string
	/** The ID of the map share */
	shareId: string
	/** URLs where the map can be downloaded from */
	mapShareUrls: Array<string>
	/** The ID of the map being shared */
	mapId: string
	/** The name of the map being shared */
	mapName: string
	/** Estimated size of the map data in bytes */
	estimatedSizeBytes: number
	/** The bounding box of the map data [minLon, minLat, maxLon, maxLat] */
	bounds: readonly [number, number, number, number]
	/** The minimum zoom level of the map data */
	minzoom: number
	/** The maximum zoom level of the map data */
	maxzoom: number
	/** Timestamp when the map was created */
	mapCreated: number
	/** Timestamp when the map share offer was received */
	receivedAt: number
}

/**
 * State of a received map share on the receiver side. A discriminated union based on the `state` field.
 *
 * Properties common to all states (from `ReceivedMapShareOffer`):
 *
 * - `senderDeviceId`: The ID of the device that sent the map share
 * - `senderDeviceName`: The name of the device that sent the map share
 * - `shareId`: The ID of the map share
 * - `mapShareUrls`: URLs where the map can be downloaded from
 * - `mapId`: The ID of the map being shared
 * - `mapName`: The name of the map being shared
 * - `estimatedSizeBytes`: Estimated size of the map data in bytes
 * - `bounds`: The bounding box of the map data `[minLon, minLat, maxLon, maxLat]`
 * - `minzoom`: The minimum zoom level of the map data
 * - `maxzoom`: The maximum zoom level of the map data
 * - `mapCreated`: Timestamp when the map was created
 * - `receivedAt`: Timestamp when the map share offer was received
 */
export type ReceivedMapShareState = ReceivedMapShareOffer &
	(
		| { state: 'pending' }
		| { state: 'rejected'; reason?: string }
		| { state: 'downloading'; downloadId: string; bytesDownloaded: number }
		| { state: 'cancelled' }
		| { state: 'aborted' }
		| { state: 'completed' }
		| { state: 'error'; error: Error }
	)

/**
 * Result of accepting a map share
 */
export type AcceptMapShareResult = {
	shareId: string
	downloadId: string
}

/**
 * Result of sending a map share
 */
export type SendMapShareResult = {
	shareId: string
}

/**
 * Parameters for rejecting a map share
 */
export type RejectMapShareParams = {
	shareId: string
	reason?: 'disk_full' | 'user_rejected' | string
}

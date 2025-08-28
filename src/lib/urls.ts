// TODO: Move these into a separate "@comapeo/asset-server" module which can
// export them to be imported directly in a client.

import type { BlobApi, IconApi } from '@comapeo/core'

const MIME_TO_EXTENSION = {
	'image/png': '.png',
	'image/svg+xml': '.svg',
}

/**
 * Get a url for a blob based on its BlobId
 */
export function getBlobUrl({
	serverPort,
	projectId,
	blobId,
}: {
	serverPort: number
	projectId: string
	blobId: BlobApi.BlobId
}) {
	const { driveId, type, variant, name } = blobId

	return `http://localhost:${serverPort}/blobs/${projectId}/${driveId}/${type}/${variant}/${name}`
}

export function getIconUrl({
	serverPort,
	iconId,
	projectId,
	mimeBasedOpts,
}: {
	serverPort: number
	iconId: string
	projectId: string
	mimeBasedOpts: IconApi.BitmapOpts | IconApi.SvgOpts
}) {
	const mimeExtension = MIME_TO_EXTENSION[mimeBasedOpts.mimeType]

	const pixelDensity =
		mimeBasedOpts.mimeType === 'image/svg+xml' ||
		// if the pixel density is 1, we can omit the density suffix in the resulting url
		// and assume the pixel density is 1 for applicable mime types when using the url
		mimeBasedOpts.pixelDensity === 1
			? undefined
			: mimeBasedOpts.pixelDensity

	return (
		`http://localhost:${serverPort}/icons/${projectId}/` +
		constructIconPath({
			pixelDensity,
			size: mimeBasedOpts.size,
			extension: mimeExtension,
			iconId,
		})
	)
}

type IconPathOptions = {
	iconId: string
	size: string
	pixelDensity?: number
	extension: string
}

/**
 * General purpose path builder for an icon
 */
function constructIconPath({
	size,
	pixelDensity,
	iconId,
	extension,
}: IconPathOptions): string {
	if (iconId.length === 0 || size.length === 0 || extension.length === 0) {
		throw new Error('iconId, size, and extension cannot be empty strings')
	}

	let result = `${iconId}/${size}`

	if (typeof pixelDensity === 'number') {
		if (pixelDensity < 1) {
			throw new Error('pixelDensity must be a positive number')
		}
		result += `@${pixelDensity}x`
	}

	result += extension.startsWith('.') ? extension : '.' + extension

	return result
}

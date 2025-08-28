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
export function getBlobUrl(baseUrl: string, blobId: BlobApi.BlobId) {
	const { driveId, type, variant, name } = blobId

	if (!baseUrl.endsWith('/')) {
		baseUrl += '/'
	}

	return baseUrl + `${driveId}/${type}/${variant}/${name}`
}

/**
 * @param {string} iconId
 * @param {BitmapOpts | SvgOpts} opts
 *
 * @returns {Promise<string>}
 */
export function getIconUrl(
	baseUrl: string,
	iconId: string,
	opts: IconApi.BitmapOpts | IconApi.SvgOpts,
) {
	if (!baseUrl.endsWith('/')) {
		baseUrl += '/'
	}

	const mimeExtension = MIME_TO_EXTENSION[opts.mimeType]

	const pixelDensity =
		opts.mimeType === 'image/svg+xml' ||
		// if the pixel density is 1, we can omit the density suffix in the resulting url
		// and assume the pixel density is 1 for applicable mime types when using the url
		opts.pixelDensity === 1
			? undefined
			: opts.pixelDensity

	return (
		baseUrl +
		constructIconPath({
			pixelDensity,
			size: opts.size,
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

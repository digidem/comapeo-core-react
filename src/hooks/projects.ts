import type { BlobId } from '@comapeo/core/dist/types'
import { useSuspenseQuery } from '@tanstack/react-query'

import {
	attachmentUrlQueryOptions,
	documentCreatedByQueryOptions,
	iconUrlQueryOptions,
	projectByIdQueryOptions,
	projectMemberByIdQueryOptions,
	projectMembersQueryOptions,
	projectSettingsQueryOptions,
	projectsQueryOptions,
} from '../lib/react-query/projects'
import { useClientApi } from './client'

/**
 * Retrieve the project settings for a project.
 *
 * @param {Object} opts
 * @param {string} opts.projectId Project public ID
 *
 * @example
 * ```tsx
 * function BasicExample() {
 *   const { data, isRefetching } = useProjectSettings({ projectId: '...' })
 *
 *   console.log(data.name)
 * }
 * ```
 */
export function useProjectSettings({ projectId }: { projectId: string }) {
	const clientApi = useClientApi()

	const { data: projectApi } = useSuspenseQuery(
		projectByIdQueryOptions({
			projectId,
			clientApi,
		}),
	)

	const { data, isRefetching } = useSuspenseQuery(
		projectSettingsQueryOptions({
			projectApi,
			projectId,
		}),
	)

	return { data, isRefetching }
}

/**
 * Retrieve a project API instance for a project.
 *
 * This is mostly used internally by the other hooks and should only be used if certain project APIs are not exposed via the hooks.
 *
 * @param {Object} opts
 * @param {string} opts.projectId Project public ID
 *
 * @example
 * ```tsx
 * function BasicExample() {
 *   const { data, isRefetching } = useSingleProject({ projectId: '...' })
 * }
 * ```
 */
export function useSingleProject({ projectId }: { projectId: string }) {
	const clientApi = useClientApi()

	const { data, isRefetching } = useSuspenseQuery(
		projectByIdQueryOptions({
			clientApi,
			projectId,
		}),
	)

	return { data, isRefetching }
}

/**
 * Retrieve project information for each project that exists.
 *
 * @example
 * ```tsx
 * function BasicExample() {
 *   const { data, isRefetching } = useManyProjects()
 *
 *   console.log(data.map(project => project.name))
 * }
 * ```
 */
export function useManyProjects() {
	const clientApi = useClientApi()

	const { data, isRefetching } = useSuspenseQuery(
		projectsQueryOptions({
			clientApi,
		}),
	)

	return { data, isRefetching }
}

/**
 * Retrieve a single member of a project.
 *
 * @param {Object} opts
 * @param {string} opts.projectId Project public ID
 * @param {deviceId} opts.projectId Device ID of interest
 *
 * @example
 * ```tsx
 * function BasicExample() {
 *   const { data, isRefetching } = useSingleMember({ projectId: '...', deviceId: '...' })
 *
 *   console.log(data.role)
 * }
 * ```
 */
export function useSingleMember({
	projectId,
	deviceId,
}: {
	projectId: string
	deviceId: string
}) {
	const { data: projectApi } = useSingleProject({ projectId })

	const { data, isRefetching } = useSuspenseQuery(
		projectMemberByIdQueryOptions({
			projectApi,
			projectId,
			deviceId,
		}),
	)

	return { data, isRefetching }
}

/**
 * Retrieve all members of a project.
 *
 * @param {Object} opts
 * @param {string} opts.projectId Project public ID
 *
 * @example
 * ```tsx
 * function BasicExample() {
 *   const { data, isRefetching } = useManyMembers({ projectId: '...' })
 *
 *   console.log(data.role)
 * }
 * ```
 */
export function useManyMembers({ projectId }: { projectId: string }) {
	const { data: projectApi } = useSingleProject({ projectId })

	const { data, isRefetching } = useSuspenseQuery(
		projectMembersQueryOptions({ projectApi, projectId }),
	)

	return { data, isRefetching }
}

/**
 * Retrieve a URL that points to icon resources served by the embedded HTTP server.
 *
 * _TODO: Explain bitmap opts vs svg opts_
 *
 * @param {Object} opts
 * @param {string} opts.projectId Project public ID
 * @param {string} opts.iconId Icon ID of interest
 * @param {BitmapOpts | SvgOpts} opts.opts Parameters related to the mime type of the icon of interest
 *
 * @example
 * ```tsx
 * function PngExample() {
 *   const { data, isRefetching } = useIconUrl({
 *     projectId: '...',
 *     iconId: '...',
 *     opts: {
 *       mimeType: 'image/png',
 *       pixelDensity: 1,
 *       size: 'medium'
 *     }
 *   })
 * }
 * ```
 *
 * ```tsx
 * function SvgExample() {
 *   const { data, isRefetching } = useIconUrl({
 *     projectId: '...',
 *     iconId: '...',
 *     opts: {
 *       mimeType: 'image/svg',
 *       size: 'medium'
 *     }
 *   })
 * }
 * ```
 */
export function useIconUrl({
	projectId,
	iconId,
	opts,
}: {
	projectId: string
	iconId: string
	opts: Parameters<typeof iconUrlQueryOptions>[0]['opts']
}) {
	const { data: projectApi } = useSingleProject({ projectId })

	const { data, isRefetching } = useSuspenseQuery(
		iconUrlQueryOptions({
			projectApi,
			projectId,
			iconId,
			opts,
		}),
	)

	return { data, isRefetching }
}

/**
 * Retrieve a URL that points to a desired blob resource.
 *
 * _TODO: Explain BlobId in more depth_
 *
 * @param {Object} opts
 * @param {string} opts.projectId Project public Id
 * @param {BlobId} opts.blobId Blob ID of the desired resource
 *
 * @example
 * ```tsx
 * function PhotoExample() {
 *   const { data, isRefetching } = useAttachmentUrl({
 *     projectId: '...',
 *     blobId: {
 *       type: 'photo',
 *       variant: 'thumbnail',
 *       name: '...',
 *       driveId: '...',
 *     }
 *   })
 * }
 * ```
 *
 * ```tsx
 * function AudioExample() {
 *   const { data, isRefetching } = useAttachmentUrl({
 *     projectId: '...',
 *     blobId: {
 *       type: 'audio',
 *       variant: 'original',
 *       name: '...',
 *       driveId: '...',
 *     }
 *   })
 * }
 * ```
 *
 * ```tsx
 * function VideoExample() {
 *   const { data, isRefetching } = useAttachmentUrl({
 *     projectId: '...',
 *     blobId: {
 *       type: 'video',
 *       variant: 'original',
 *       name: '...',
 *       driveId: '...',
 *     }
 *   })
 * }
 * ```
 */
export function useAttachmentUrl({
	projectId,
	blobId,
}: {
	projectId: string
	blobId: BlobId
}) {
	const { data: projectApi } = useSingleProject({ projectId })

	const { data, isRefetching } = useSuspenseQuery(
		attachmentUrlQueryOptions({
			projectApi,
			projectId,
			blobId,
		}),
	)

	return { data, isRefetching }
}

// TODO: Eventually remove in favor of this information being provided by the backend when retrieving documents
/**
 * Retrieve the device ID that created a document.
 *
 * @param {Object} opts
 * @param {string} opts.projectId Project public ID
 * @param {string} opts.originalVersionId Version ID of document
 *
 * @example
 * ```tsx
 * function BasicExample() {
 *   const { data, isRefetching } = useDocumentCreatedBy({
 *     projectId: '...',
 *     originalVersionId: '...',
 *   })
 * }
 * ```
 */
export function useDocumentCreatedBy({
	projectId,
	originalVersionId,
}: {
	projectId: string
	originalVersionId: string
}) {
	const { data: projectApi } = useSingleProject({ projectId })

	const { data, isRefetching } = useSuspenseQuery(
		documentCreatedByQueryOptions({ projectApi, projectId, originalVersionId }),
	)

	return { data, isRefetching }
}

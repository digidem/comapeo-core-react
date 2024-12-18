import type {
	BitmapOpts,
	SvgOpts,
} from '@comapeo/core/dist/icon-api.js' with { 'resolution-mode': 'import' }
import type { BlobId } from '@comapeo/core/dist/types.js' with { 'resolution-mode': 'import' }
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
} from '../lib/react-query/projects.js'
import { useClientApi } from './client.js'

/**
 * Retrieve the project settings for a project.
 *
 * @param opts.projectId Project public ID
 *
 * @example
 * ```tsx
 * function BasicExample() {
 *   const { data } = useProjectSettings({ projectId: '...' })
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

	const { data, error, isRefetching } = useSuspenseQuery(
		projectSettingsQueryOptions({
			projectApi,
			projectId,
		}),
	)

	return { data, error, isRefetching }
}

/**
 * Retrieve a project API instance for a project.
 *
 * This is mostly used internally by the other hooks and should only be used if certain project APIs are not exposed via the hooks.
 *
 * @param opts.projectId Project public ID
 *
 * @example
 * ```tsx
 * function BasicExample() {
 *   const { data } = useSingleProject({ projectId: '...' })
 * }
 * ```
 */
export function useSingleProject({ projectId }: { projectId: string }) {
	const clientApi = useClientApi()

	const { data, error, isRefetching } = useSuspenseQuery({
		...projectByIdQueryOptions({
			clientApi,
			projectId,
		}),
		// Keep project instances around indefinitely - shouldn't be a memory
		// problem because these are only lightweight proxy objects, and project
		// references are kept indefinitely on the backend anyway once they are
		// accessed
		staleTime: Infinity,
		gcTime: Infinity,
	})

	return { data, error, isRefetching }
}

/**
 * Retrieve project information for each project that exists.
 *
 * @example
 * ```tsx
 * function BasicExample() {
 *   const { data } = useManyProjects()
 *
 *   console.log(data.map(project => project.name))
 * }
 * ```
 */
export function useManyProjects() {
	const clientApi = useClientApi()

	const { data, error, isRefetching } = useSuspenseQuery(
		projectsQueryOptions({
			clientApi,
		}),
	)

	return { data, error, isRefetching }
}

/**
 * Retrieve a single member of a project.
 *
 * @param opts.projectId Project public ID
 * @param opts.projectId Device ID of interest
 *
 * @example
 * ```tsx
 * function BasicExample() {
 *   const { data } = useSingleMember({ projectId: '...', deviceId: '...' })
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

	const { data, error, isRefetching } = useSuspenseQuery(
		projectMemberByIdQueryOptions({
			projectApi,
			projectId,
			deviceId,
		}),
	)

	return { data, error, isRefetching }
}

/**
 * Retrieve all members of a project.
 *
 * @param opts.projectId Project public ID
 *
 * @example
 * ```tsx
 * function BasicExample() {
 *   const { data } = useManyMembers({ projectId: '...' })
 *
 *   console.log(data.role)
 * }
 * ```
 */
export function useManyMembers({ projectId }: { projectId: string }) {
	const { data: projectApi } = useSingleProject({ projectId })

	const { data, error, isRefetching } = useSuspenseQuery(
		projectMembersQueryOptions({ projectApi, projectId }),
	)

	return { data, error, isRefetching }
}

/**
 * Retrieve a URL that points to icon resources served by the embedded HTTP server.
 *
 * _TODO: Explain bitmap opts vs svg opts_
 *
 * @param opts.projectId Project public ID
 * @param opts.iconId Icon ID of interest
 * @param opts.mimeType MIME type of desired resource
 * @param opts.pixelDensity Pixel density resource (only applicable when `mimeType` is `'image/png'`)
 * @param opts.size Size of desired resource
 *
 * @example
 * ```tsx
 * function PngExample() {
 *   const { data } = useIconUrl({
 *     projectId: '...',
 *     iconId: '...',
 *     mimeType: 'image/png',
 *     pixelDensity: 1,
 *     size: 'medium'
 *   })
 * }
 * ```
 *
 * ```tsx
 * function SvgExample() {
 *   const { data } = useIconUrl({
 *     projectId: '...',
 *     iconId: '...',
 *     mimeType: 'image/svg',
 *     size: 'medium'
 *   })
 * }
 * ```
 */
export function useIconUrl({
	projectId,
	iconId,
	...mimeBasedOpts
}: {
	projectId: string
	iconId: string
} & (BitmapOpts | SvgOpts)) {
	const { data: projectApi } = useSingleProject({ projectId })

	const { data, error, isRefetching } = useSuspenseQuery(
		iconUrlQueryOptions({
			...mimeBasedOpts,
			projectApi,
			projectId,
			iconId,
		}),
	)

	return { data, error, isRefetching }
}

/**
 * Retrieve a URL that points to a desired blob resource.
 *
 * _TODO: Explain BlobId in more depth_
 *
 * @param opts.projectId Project public Id
 * @param opts.blobId Blob ID of the desired resource
 *
 * @example
 * ```tsx
 * function PhotoExample() {
 *   const { data } = useAttachmentUrl({
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
 *   const { data } = useAttachmentUrl({
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
 *   const { data } = useAttachmentUrl({
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

	const { data, error, isRefetching } = useSuspenseQuery(
		attachmentUrlQueryOptions({
			projectApi,
			projectId,
			blobId,
		}),
	)

	return { data, error, isRefetching }
}

// TODO: Eventually remove in favor of this information being provided by the backend when retrieving documents
/**
 * Retrieve the device ID that created a document.
 *
 * @param opts.projectId Project public ID
 * @param opts.originalVersionId Version ID of document
 *
 * @example
 * ```tsx
 * function BasicExample() {
 *   const { data } = useDocumentCreatedBy({
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

	const { data, error, isRefetching } = useSuspenseQuery(
		documentCreatedByQueryOptions({ projectApi, projectId, originalVersionId }),
	)

	return { data, error, isRefetching }
}

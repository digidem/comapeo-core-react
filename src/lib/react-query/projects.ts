import type { BitmapOpts, SvgOpts } from '@comapeo/core/dist/icon-api'
import type { BlobId } from '@comapeo/core/dist/types.js'
import type { MapeoClientApi, MapeoProjectApi } from '@comapeo/ipc'
import { queryOptions } from '@tanstack/react-query'

import { baseQueryOptions, ROOT_QUERY_KEY } from './shared'

export function getProjectsQueryKey() {
	return [ROOT_QUERY_KEY, 'projects'] as const
}

export function getProjectByIdQueryKey({ projectId }: { projectId: string }) {
	return [ROOT_QUERY_KEY, 'projects', projectId] as const
}

export function getProjectSettingsQueryKey({
	projectId,
}: {
	projectId: string
}) {
	return [ROOT_QUERY_KEY, 'projects', projectId, 'project_settings'] as const
}

export function getProjectRoleQueryKey({ projectId }: { projectId: string }) {
	return [ROOT_QUERY_KEY, 'projects', projectId, 'role'] as const
}

export function getMembersQueryKey({ projectId }: { projectId: string }) {
	return [ROOT_QUERY_KEY, 'projects', projectId, 'members'] as const
}

export function getMemberByIdQueryKey({
	projectId,
	deviceId,
}: {
	projectId: string
	deviceId: string
}) {
	return [ROOT_QUERY_KEY, 'projects', projectId, 'members', deviceId] as const
}

export function getIconUrlQueryKey({
	projectId,
	iconId,
	...mimeBasedOpts
}: {
	projectId: string
	iconId: string
} & (BitmapOpts | SvgOpts)) {
	return [
		ROOT_QUERY_KEY,
		'projects',
		projectId,
		'icons',
		iconId,
		mimeBasedOpts,
	] as const
}

export function getDocumentCreatedByQueryKey({
	projectId,
	originalVersionId,
}: {
	projectId: string
	originalVersionId: string
}) {
	return [
		ROOT_QUERY_KEY,
		'projects',
		projectId,
		'document_created_by',
		originalVersionId,
	] as const
}

export function getAttachmentUrlQueryKey({
	projectId,
	blobId,
}: {
	projectId: string
	blobId: BlobId
}) {
	return [ROOT_QUERY_KEY, 'projects', projectId, 'attachments', blobId] as const
}

export function projectsQueryOptions({
	clientApi,
}: {
	clientApi: MapeoClientApi
}) {
	return queryOptions({
		...baseQueryOptions(),
		queryKey: getProjectsQueryKey(),
		queryFn: async () => {
			return clientApi.listProjects()
		},
	})
}

export function projectByIdQueryOptions({
	clientApi,
	projectId,
}: {
	clientApi: MapeoClientApi
	projectId: string
}) {
	return queryOptions({
		...baseQueryOptions(),
		queryKey: getProjectByIdQueryKey({ projectId }),
		queryFn: async () => {
			return clientApi.getProject(projectId)
		},
	})
}

export function projectSettingsQueryOptions({
	projectApi,
	projectId,
}: {
	projectApi: MapeoProjectApi
	projectId: string
}) {
	return queryOptions({
		...baseQueryOptions(),
		queryKey: getProjectSettingsQueryKey({ projectId }),
		queryFn: async () => {
			return projectApi.$getProjectSettings()
		},
	})
}

export function projectMembersQueryOptions({
	projectApi,
	projectId,
}: {
	projectApi: MapeoProjectApi
	projectId: string
}) {
	return queryOptions({
		...baseQueryOptions(),
		queryKey: getMembersQueryKey({ projectId }),
		queryFn: async () => {
			return projectApi.$member.getMany()
		},
	})
}

export function projectMemberByIdQueryOptions({
	projectApi,
	projectId,
	deviceId,
}: {
	projectApi: MapeoProjectApi
	projectId: string
	deviceId: string
}) {
	return queryOptions({
		...baseQueryOptions(),
		queryKey: getMemberByIdQueryKey({ projectId, deviceId }),
		queryFn: async () => {
			return projectApi.$member.getById(deviceId)
		},
	})
}

export function projectOwnRoleQueryOptions({
	projectApi,
	projectId,
}: {
	projectApi: MapeoProjectApi
	projectId: string
}) {
	return queryOptions({
		...baseQueryOptions(),
		queryKey: getProjectRoleQueryKey({ projectId }),
		queryFn: async () => {
			return projectApi.$getOwnRole()
		},
	})
}

export function iconUrlQueryOptions({
	projectApi,
	projectId,
	iconId,
	...mimeBasedOpts
}: {
	projectApi: MapeoProjectApi
	projectId: string
	iconId: Parameters<MapeoProjectApi['$icons']['getIconUrl']>[0]
} & (BitmapOpts | SvgOpts)) {
	return queryOptions({
		...baseQueryOptions(),
		queryKey: getIconUrlQueryKey({ ...mimeBasedOpts, projectId, iconId }),
		queryFn: async () => {
			return projectApi.$icons.getIconUrl(iconId, mimeBasedOpts)
		},
	})
}

export function documentCreatedByQueryOptions({
	projectApi,
	projectId,
	originalVersionId,
}: {
	projectApi: MapeoProjectApi
	projectId: string
	originalVersionId: string
}) {
	return queryOptions({
		...baseQueryOptions(),
		queryKey: getDocumentCreatedByQueryKey({
			projectId,
			originalVersionId,
		}),
		queryFn: async () => {
			return projectApi.$originalVersionIdToDeviceId(originalVersionId)
		},
	})
}

export function attachmentUrlQueryOptions({
	projectApi,
	projectId,
	blobId,
}: {
	projectApi: MapeoProjectApi
	projectId: string
	blobId: BlobId
}) {
	return queryOptions({
		...baseQueryOptions(),
		queryKey: getAttachmentUrlQueryKey({ projectId, blobId }),
		queryFn: async () => {
			// TODO: Might need a refresh token? (similar to map style url)
			return projectApi.$blobs.getUrl(blobId)
		},
	})
}

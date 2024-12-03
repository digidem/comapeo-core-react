import type { BlobId } from '@comapeo/core/dist/types.js'
import type { MapeoClientApi, MapeoProjectApi } from '@comapeo/ipc'
import { queryOptions } from '@tanstack/react-query'

import { BASE_QUERY_OPTIONS, ROOT_QUERY_KEY } from './shared'

export const PROJECTS_QUERY_KEYS = {
	projects: () => {
		return [ROOT_QUERY_KEY, 'projects'] as const
	},
	projectById: ({ projectId }: { projectId: string }) => {
		return [ROOT_QUERY_KEY, 'projects', projectId] as const
	},
	projectSettings: ({ projectId }: { projectId: string }) => {
		return [ROOT_QUERY_KEY, 'projects', projectId, 'project_settings'] as const
	},
	projectRole: ({ projectId }: { projectId: string }) => {
		return [ROOT_QUERY_KEY, 'projects', projectId, 'role'] as const
	},
	members: ({ projectId }: { projectId: string }) => {
		return [ROOT_QUERY_KEY, 'projects', projectId, 'members'] as const
	},
	memberById: ({
		projectId,
		deviceId,
	}: {
		projectId: string
		deviceId: string
	}) => {
		return [ROOT_QUERY_KEY, 'projects', projectId, 'members', deviceId] as const
	},
	iconUrl: ({
		projectId,
		iconId,
		opts,
	}: {
		projectId: string
		iconId: Parameters<MapeoProjectApi['$icons']['getIconUrl']>[0]
		opts: Parameters<MapeoProjectApi['$icons']['getIconUrl']>[1]
	}) => {
		return [
			ROOT_QUERY_KEY,
			'projects',
			projectId,
			'icons',
			iconId,
			opts,
		] as const
	},
	documentCreatedBy: ({
		projectId,
		originalVersionId,
	}: {
		projectId: string
		originalVersionId: string
	}) => {
		return [
			ROOT_QUERY_KEY,
			'projects',
			projectId,
			'document_created_by',
			originalVersionId,
		] as const
	},
	attachmentUrl: ({
		projectId,
		blobId,
	}: {
		projectId: string
		blobId: BlobId
	}) => {
		return [
			ROOT_QUERY_KEY,
			'projects',
			projectId,
			'attachments',
			blobId,
		] as const
	},
}

export function projectsQueryOptions({
	clientApi,
}: {
	clientApi: MapeoClientApi
}) {
	return queryOptions({
		...BASE_QUERY_OPTIONS,
		queryKey: PROJECTS_QUERY_KEYS.projects(),
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
		...BASE_QUERY_OPTIONS,
		queryKey: PROJECTS_QUERY_KEYS.projectById({ projectId }),
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
		...BASE_QUERY_OPTIONS,
		queryKey: PROJECTS_QUERY_KEYS.projectSettings({ projectId }),
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
		...BASE_QUERY_OPTIONS,
		queryKey: PROJECTS_QUERY_KEYS.members({ projectId }),
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
		...BASE_QUERY_OPTIONS,
		queryKey: PROJECTS_QUERY_KEYS.memberById({ projectId, deviceId }),
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
		...BASE_QUERY_OPTIONS,
		queryKey: PROJECTS_QUERY_KEYS.projectRole({ projectId }),
		queryFn: async () => {
			return projectApi.$getOwnRole()
		},
	})
}

export function iconUrlQueryOptions({
	projectApi,
	projectId,
	iconId,
	opts,
}: {
	projectApi: MapeoProjectApi
	projectId: string
	iconId: Parameters<MapeoProjectApi['$icons']['getIconUrl']>[0]
	opts: Parameters<MapeoProjectApi['$icons']['getIconUrl']>[1]
}) {
	return queryOptions({
		...BASE_QUERY_OPTIONS,
		queryKey: PROJECTS_QUERY_KEYS.iconUrl({ projectId, iconId, opts }),
		queryFn: async () => {
			return projectApi.$icons.getIconUrl(iconId, opts)
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
		...BASE_QUERY_OPTIONS,
		queryKey: PROJECTS_QUERY_KEYS.documentCreatedBy({
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
		...BASE_QUERY_OPTIONS,
		queryKey: PROJECTS_QUERY_KEYS.attachmentUrl({ projectId, blobId }),
		queryFn: async () => {
			// TODO: Might need a refresh token? (similar to map style url)
			return projectApi.$blobs.getUrl(blobId)
		},
	})
}

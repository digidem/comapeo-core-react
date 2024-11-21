import type { MapeoClientApi, MapeoProjectApi } from '@comapeo/ipc'
import { queryOptions } from '@tanstack/react-query'

import { ROOT_QUERY_KEY } from '../constants.js'

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
		memberId,
	}: {
		projectId: string
		memberId: string
	}) => {
		return [ROOT_QUERY_KEY, 'projects', projectId, 'members', memberId] as const
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
}

export function projectsQueryOptions({
	clientApi,
}: {
	clientApi: MapeoClientApi
}) {
	return queryOptions({
		queryKey: PROJECTS_QUERY_KEYS.projects(),
		queryFn: () => {
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
		queryKey: PROJECTS_QUERY_KEYS.projectById({ projectId }),
		queryFn: () => {
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
		queryKey: PROJECTS_QUERY_KEYS.projectSettings({ projectId }),
		queryFn: () => {
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
		queryKey: PROJECTS_QUERY_KEYS.members({ projectId }),
		queryFn: () => {
			return projectApi.$member.getMany()
		},
	})
}

export function projectMemberByIdQueryOptions({
	projectApi,
	projectId,
	memberId,
}: {
	projectApi: MapeoProjectApi
	projectId: string
	memberId: string
}) {
	return queryOptions({
		queryKey: PROJECTS_QUERY_KEYS.memberById({ projectId, memberId }),
		queryFn: () => {
			return projectApi.$member.getById(memberId)
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
		queryKey: PROJECTS_QUERY_KEYS.projectRole({ projectId }),
		queryFn: () => {
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
		queryKey: PROJECTS_QUERY_KEYS.iconUrl({ projectId, iconId, opts }),
		queryFn: () => {
			return projectApi.$icons.getIconUrl(iconId, opts)
		},
	})
}

// TODO: Maybe move to documents.ts?
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
		queryKey: PROJECTS_QUERY_KEYS.documentCreatedBy({
			projectId,
			originalVersionId,
		}),
		queryFn: () => {
			return projectApi.$originalVersionIdToDeviceId(originalVersionId)
		},
	})
}

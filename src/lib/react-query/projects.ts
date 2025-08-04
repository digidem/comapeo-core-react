import type { Metadata } from '@comapeo/core/dist/blob-api.js' with { 'resolution-mode': 'import' }
import type {
	BitmapOpts,
	SvgOpts,
} from '@comapeo/core/dist/icon-api.js' with { 'resolution-mode': 'import' }
import type { EditableProjectSettings } from '@comapeo/core/dist/mapeo-project.js' with { 'resolution-mode': 'import' }
import type { BlobId } from '@comapeo/core/dist/types.js' with { 'resolution-mode': 'import' }
import type {
	MapeoClientApi,
	MapeoProjectApi,
} from '@comapeo/ipc' with { 'resolution-mode': 'import' }
import type { ProjectSettings } from '@comapeo/schema' with { 'resolution-mode': 'import' }
import {
	queryOptions,
	type QueryClient,
	type UseMutationOptions,
	type UseSuspenseQueryOptions,
} from '@tanstack/react-query'

import {
	baseMutationOptions,
	baseQueryOptions,
	ROOT_QUERY_KEY,
} from './shared.js'

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
}): UseSuspenseQueryOptions<
	MapeoProjectApi,
	Error,
	MapeoProjectApi,
	ReturnType<typeof getProjectByIdQueryKey>
> {
	return queryOptions({
		...baseQueryOptions(),
		queryKey: getProjectByIdQueryKey({ projectId }),
		queryFn: async (): Promise<MapeoProjectApi> => {
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

export function addServerPeerMutationOptions({
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
		mutationFn: async ({ baseUrl, dangerouslyAllowInsecureConnections }) => {
			return projectApi.$member.addServerPeer(baseUrl, {
				dangerouslyAllowInsecureConnections,
			})
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: getMembersQueryKey({ projectId }),
			})
		},
	} satisfies UseMutationOptions<
		void,
		Error,
		{ baseUrl: string; dangerouslyAllowInsecureConnections?: boolean }
	>
}

export function removeServerPeerMutationOptions({
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
		mutationFn: async ({
			serverDeviceId,
			dangerouslyAllowInsecureConnections,
		}) => {
			return projectApi.$member.removeServerPeer(serverDeviceId, {
				dangerouslyAllowInsecureConnections,
			})
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: getMembersQueryKey({ projectId }),
			})
		},
	} satisfies UseMutationOptions<
		void,
		Error,
		{ serverDeviceId: string; dangerouslyAllowInsecureConnections?: boolean }
	>
}

export function createProjectMutationOptions({
	clientApi,
	queryClient,
}: {
	clientApi: MapeoClientApi
	queryClient: QueryClient
}) {
	return {
		...baseMutationOptions(),
		mutationFn: async (opts) => {
			// Have to avoid passing `undefined` explicitly
			// See https://github.com/digidem/rpc-reflector/issues/21
			return opts
				? clientApi.createProject({
						configPath: opts.configPath,
						name: opts.name,
					})
				: clientApi.createProject()
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: getProjectsQueryKey(),
			})
		},
	} satisfies UseMutationOptions<
		string,
		Error,
		{ name?: string; configPath?: string } | undefined
	>
}

export function leaveProjectMutationOptions({
	clientApi,
	queryClient,
}: {
	clientApi: MapeoClientApi
	queryClient: QueryClient
}) {
	return {
		...baseMutationOptions(),
		mutationFn: async ({ projectId }) => {
			return clientApi.leaveProject(projectId)
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: getProjectsQueryKey(),
			})
		},
	} satisfies UseMutationOptions<void, Error, { projectId: string }>
}

export function importProjectConfigMutationOptions({
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
		mutationFn: ({ configPath }) => {
			return projectApi.importConfig({ configPath })
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: getProjectByIdQueryKey({ projectId }),
			})
		},
	} satisfies UseMutationOptions<Array<Error>, Error, { configPath: string }>
}

export function updateProjectSettingsMutationOptions({
	projectApi,
	queryClient,
}: {
	projectApi: MapeoProjectApi
	queryClient: QueryClient
}) {
	return {
		...baseMutationOptions(),
		mutationFn: async (value) => {
			return projectApi.$setProjectSettings(value)
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: getProjectsQueryKey(),
			})
		},
	} satisfies UseMutationOptions<
		EditableProjectSettings,
		Error,
		{
			name?: ProjectSettings['name']
			configMetadata?: ProjectSettings['configMetadata']
			defaultPresets?: ProjectSettings['defaultPresets']
			projectColor?: ProjectSettings['projectColor']
			projectDescription?: ProjectSettings['projectDescription']
		}
	>
}

export function createBlobMutationOptions({
	projectApi,
}: {
	projectApi: MapeoProjectApi
}) {
	return {
		...baseMutationOptions(),
		mutationFn: async ({ original, preview, thumbnail, metadata }) => {
			return projectApi.$blobs.create(
				{ original, preview, thumbnail },
				metadata,
			)
		},
	} satisfies UseMutationOptions<
		{
			driveId: string
			name: string
			type: 'photo' | 'audio' | 'video'
			hash: string
		},
		Error,
		{
			original: string
			preview?: string
			thumbnail?: string
			metadata: Metadata
		}
	>
}

export function startSyncMutationOptions({
	projectApi,
}: {
	projectApi: MapeoProjectApi
}) {
	return {
		...baseMutationOptions(),
		mutationFn: async (opts) => {
			// Have to avoid passing `undefined` explicitly
			// See https://github.com/digidem/rpc-reflector/issues/21
			return opts ? projectApi.$sync.start(opts) : projectApi.$sync.start()
		},
	} satisfies UseMutationOptions<
		void,
		Error,
		{ autostopDataSyncAfter: number | null } | undefined
	>
}

export function stopSyncMutationOptions({
	projectApi,
}: {
	projectApi: MapeoProjectApi
}) {
	return {
		...baseMutationOptions(),
		mutationFn: async () => {
			return projectApi.$sync.stop()
		},
	} satisfies UseMutationOptions<void, Error, void>
}

export function connectSyncServersMutationOptions({
	projectApi,
}: {
	projectApi: MapeoProjectApi
}) {
	return {
		...baseMutationOptions(),
		mutationFn: async () => {
			return projectApi.$sync.connectServers()
		},
	} satisfies UseMutationOptions<void, Error, void>
}

export function disconnectSyncServersMutationOptions({
	projectApi,
}: {
	projectApi: MapeoProjectApi
}) {
	return {
		...baseMutationOptions(),
		mutationFn: async () => {
			return projectApi.$sync.disconnectServers()
		},
	} satisfies UseMutationOptions<void, Error, void>
}

export function setAutostopDataSyncTimeoutMutationOptions({
	projectApi,
}: {
	projectApi: MapeoProjectApi
}) {
	return {
		...baseMutationOptions(),
		mutationFn: async ({ after }) => {
			return projectApi.$sync.setAutostopDataSyncTimeout(after)
		},
	} satisfies UseMutationOptions<void, Error, { after: number | null }>
}

export function exportGeoJSONMutationOptions({
	projectApi,
}: {
	projectApi: MapeoProjectApi
}) {
	return {
		...baseMutationOptions(),
		mutationFn: async (opts) => {
			return projectApi.exportGeoJSONFile(opts.path, opts.exportOptions)
		},
	} satisfies UseMutationOptions<
		string,
		Error,
		{
			path: string
			exportOptions: {
				observations?: boolean
				tracks?: boolean
				lang?: string
			}
		}
	>
}

export function exportZipFileMutationOptions({
	projectApi,
}: {
	projectApi: MapeoProjectApi
}) {
	return {
		...baseMutationOptions(),
		mutationFn: async (opts) => {
			return projectApi.exportZipFile(opts.path, opts.exportOptions)
		},
	} satisfies UseMutationOptions<
		string,
		Error,
		{
			path: string
			exportOptions: {
				observations?: boolean
				tracks?: boolean
				lang?: string
				attachments?: boolean
			}
		}
	>
}

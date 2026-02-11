import type {
	BlobApi,
	EditableProjectSettings,
	MemberApi,
} from '@comapeo/core' with { 'resolution-mode': 'import' }
import type { MapeoClientApi, MapeoProjectApi } from '@comapeo/ipc' with {
	'resolution-mode': 'import',
}
import {
	queryOptions,
	type QueryClient,
	type UnusedSkipTokenOptions,
	type UseMutationOptions,
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

/**
 * We call this within a project hook, because that's the only place the API is
 * exposed right now, but it is the same for all projects, so no need for
 * scoping the query key to the project
 */
export function getMediaServerOriginQueryKey() {
	return [ROOT_QUERY_KEY, 'media_server_origin'] as const
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
}): UnusedSkipTokenOptions<
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
		staleTime: 'static',
		gcTime: Infinity,
	})
}

// Used as a placeholder so that we can read the server port from the $blobs.getUrl() method
const FAKE_BLOB_ID: BlobApi.BlobId = {
	type: 'photo',
	variant: 'original',
	name: 'name',
	driveId: 'drive-id',
}

export function mediaServerOriginQueryOptions({
	projectApi,
}: {
	projectApi: MapeoProjectApi
}) {
	return queryOptions({
		...baseQueryOptions(),
		// HACK: The server doesn't yet expose a method to get its origin, so we use
		// the existing $blobs.getUrl() to get the origin with a fake BlobId. The origin
		// is the same regardless of the blobId, so it's not necessary to include it
		// as a dep for the query key.
		queryKey: getMediaServerOriginQueryKey(),
		queryFn: async () => {
			const url = await projectApi.$blobs.getUrl(FAKE_BLOB_ID)
			return new URL(url).origin
		},
		staleTime: 'static',
		gcTime: Infinity,
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

export function importProjectCategoriesMutationOptions({
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
		mutationFn: ({ filePath }) => {
			return projectApi.$importCategories({ filePath })
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: getProjectByIdQueryKey({ projectId }),
			})
		},
	} satisfies UseMutationOptions<void, Error, { filePath: string }>
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
		Partial<EditableProjectSettings>
	>
}

export function changeMemberRoleMutationOptions({
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
		mutationFn: async ({ deviceId, roleId }) => {
			return projectApi.$member.assignRole(deviceId, roleId)
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: getMembersQueryKey({ projectId }),
			})
			queryClient.invalidateQueries({
				queryKey: getProjectRoleQueryKey({ projectId }),
			})
		},
	} satisfies UseMutationOptions<
		void,
		Error,
		{
			deviceId: string
			roleId: MemberApi.RoleIdAssignableToOthers
		}
	>
}

export function removeProjectMemberMutationOptions({
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
		mutationFn: async ({ deviceId, reason }) => {
			// Have to avoid passing `undefined` explicitly
			// See https://github.com/digidem/rpc-reflector/issues/21
			return reason
				? projectApi.$member.remove(deviceId, { reason })
				: projectApi.$member.remove(deviceId)
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: getMembersQueryKey({ projectId }),
			})
		},
	} satisfies UseMutationOptions<
		void,
		Error,
		{
			deviceId: string
			reason?: string
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
			metadata: BlobApi.Metadata
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

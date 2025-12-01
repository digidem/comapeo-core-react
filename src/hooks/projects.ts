import type {
	BlobApi,
	EditableProjectSettings,
	IconApi,
	MemberApi,
} from '@comapeo/core'
import type { MapeoClientApi, MapeoProjectApi } from '@comapeo/ipc'
import {
	useMutation,
	UseMutationResult,
	useQueryClient,
	useSuspenseQuery,
	type UseSuspenseQueryResult,
} from '@tanstack/react-query'
import { useEffect, useSyncExternalStore } from 'react'

import {
	baseMutationOptions,
	baseQueryOptions,
	filterMutationResult,
	getMediaServerOriginQueryKey,
	getMemberByIdQueryKey,
	getMembersQueryKey,
	getProjectByIdQueryKey,
	getProjectRoleQueryKey,
	getProjectSettingsQueryKey,
	getProjectsQueryKey,
	type FilteredMutationResult,
} from '../lib/react-query.js'
import { SyncStore, type SyncState } from '../lib/sync.js'
import { getBlobUrl, getIconUrl } from '../lib/urls.js'
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
export function useProjectSettings({
	projectId,
}: {
	projectId: string
}): // NOTE: Needs explicit return type due to TS2742
Pick<
	UseSuspenseQueryResult<
		Awaited<ReturnType<MapeoProjectApi['$getProjectSettings']>>
	>,
	'data' | 'error' | 'isRefetching'
> {
	const { data: projectApi } = useSingleProject({ projectId })

	const { data, error, isRefetching } = useSuspenseQuery({
		...baseQueryOptions(),
		queryKey: getProjectSettingsQueryKey({ projectId }),
		queryFn: async () => {
			return projectApi.$getProjectSettings()
		},
	})

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
export function useSingleProject({
	projectId,
}: {
	projectId: string
}): // NOTE: Needs explicit return type due to TS2742
Pick<
	UseSuspenseQueryResult<MapeoProjectApi>,
	'data' | 'error' | 'isRefetching'
> {
	const clientApi = useClientApi()

	const { data, error, isRefetching } = useSuspenseQuery({
		...baseQueryOptions(),
		queryKey: getProjectByIdQueryKey({ projectId }),
		queryFn: async () => {
			return clientApi.getProject(projectId)
		},
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
export function useManyProjects(): // NOTE: Needs explicit return type due to TS2742
Pick<
	UseSuspenseQueryResult<Awaited<ReturnType<MapeoClientApi['listProjects']>>>,
	'data' | 'error' | 'isRefetching'
> {
	const clientApi = useClientApi()

	const { data, error, isRefetching } = useSuspenseQuery({
		...baseQueryOptions(),
		queryKey: getProjectsQueryKey(),
		queryFn: async () => {
			return clientApi.listProjects()
		},
	})

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
}): // NOTE: Needs explicit return type due to TS2742
Pick<
	UseSuspenseQueryResult<
		Awaited<ReturnType<MapeoProjectApi['$member']['getById']>>
	>,
	'data' | 'error' | 'isRefetching'
> {
	const { data: projectApi } = useSingleProject({ projectId })

	const { data, error, isRefetching } = useSuspenseQuery({
		...baseQueryOptions(),
		queryKey: getMemberByIdQueryKey({ projectId, deviceId }),
		queryFn: async () => {
			return projectApi.$member.getById(deviceId)
		},
	})

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
 *   const activeMembers1 = useManyMembers({ projectId: '...' })
 *   const activeMembers2 = useManyMembers({ projectId: '...', includeLeft: false })
 *
 *   const allMembers = useManyMembers({ projectId: '...', includeLeft: true })
 * }
 * ```
 */
export function useManyMembers<T extends boolean>({
	projectId,
	includeLeft,
}: {
	projectId: string
	includeLeft?: T
}): // NOTE: Needs explicit return type due to TS2742
Pick<
	UseSuspenseQueryResult<
		T extends true
			? Array<MemberApi.MemberInfo>
			: Array<MemberApi.ActiveMemberInfo>
	>,
	'data' | 'error' | 'isRefetching'
> {
	const { data: projectApi } = useSingleProject({ projectId })

	const { data, error, isRefetching } = useSuspenseQuery({
		...baseQueryOptions(),
		queryKey: getMembersQueryKey({ projectId, includeLeft }),
		queryFn: async () => {
			return projectApi.$member.getMany({ includeLeft })
		},
	})

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
} & (IconApi.BitmapOpts | IconApi.SvgOpts)) {
	const { data: projectApi } = useSingleProject({ projectId })

	const {
		data: serverOrigin,
		error,
		isRefetching,
	} = useMediaServerOrigin({ projectApi })

	const iconUrl = getIconUrl({
		serverOrigin,
		iconId,
		projectId,
		mimeBasedOpts,
	})

	return { data: iconUrl, error, isRefetching }
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
	blobId: BlobApi.BlobId
}) {
	const { data: projectApi } = useSingleProject({ projectId })

	const {
		data: serverOrigin,
		error,
		isRefetching,
	} = useMediaServerOrigin({ projectApi })

	const blobUrl = getBlobUrl({ serverOrigin, projectId, blobId })

	return { data: blobUrl, error, isRefetching }
}

// Used as a placeholder so that we can read the server port from the $blobs.getUrl() method
const FAKE_BLOB_ID: BlobApi.BlobId = {
	type: 'photo',
	variant: 'original',
	name: 'name',
	driveId: 'drive-id',
}

/**
 * @internal
 * Hack to retrieve the media server origin (protocol + host).
 */
function useMediaServerOrigin({ projectApi }: { projectApi: MapeoProjectApi }) {
	const { data, error, isRefetching } = useSuspenseQuery({
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

	return { data, error, isRefetching }
}

/**
 * Get the role for the current device in a specified project.
 * This is a more convenient alternative to using the `useOwnDeviceInfo` and `useManyMembers` hooks.
 *
 * @param opts.projectId Project public ID
 *
 * @example
 * ```tsx
 * function BasicExample() {
 *   const { data } = useOwnRoleInProject({
 *     projectId: '...',
 *   })
 * }
 * ```
 */
export function useOwnRoleInProject({
	projectId,
}: {
	projectId: string
}): // NOTE: Needs explicit return type due to TS2742
Pick<
	UseSuspenseQueryResult<Awaited<ReturnType<MapeoProjectApi['$getOwnRole']>>>,
	'data' | 'error' | 'isRefetching'
> {
	const { data: projectApi } = useSingleProject({ projectId })

	const { data, error, isRefetching } = useSuspenseQuery({
		...baseQueryOptions(),
		queryKey: getProjectRoleQueryKey({ projectId }),
		queryFn: async () => {
			return projectApi.$getOwnRole()
		},
	})

	return { data, error, isRefetching }
}

export function useAddServerPeer({ projectId }: { projectId: string }) {
	const queryClient = useQueryClient()
	const { data: projectApi } = useSingleProject({ projectId })

	return filterMutationResult(
		useMutation({
			...baseMutationOptions(),
			mutationFn: async ({
				baseUrl,
				dangerouslyAllowInsecureConnections,
			}: {
				baseUrl: string
				dangerouslyAllowInsecureConnections?: boolean
			}) => {
				return projectApi.$member.addServerPeer(baseUrl, {
					dangerouslyAllowInsecureConnections,
				})
			},
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: getMembersQueryKey({ projectId }),
				})
			},
		}),
	)
}

export function useRemoveServerPeer({ projectId }: { projectId: string }) {
	const queryClient = useQueryClient()
	const { data: projectApi } = useSingleProject({ projectId })

	return filterMutationResult(
		useMutation({
			...baseMutationOptions(),
			mutationFn: async ({
				serverDeviceId,
				dangerouslyAllowInsecureConnections,
			}: {
				serverDeviceId: string
				dangerouslyAllowInsecureConnections?: boolean
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
		}),
	)
}

/**
 * Create a new project.
 */
export function useCreateProject() {
	const queryClient = useQueryClient()
	const clientApi = useClientApi()

	return filterMutationResult(
		useMutation({
			...baseMutationOptions(),
			mutationFn: async (
				opts?: Parameters<MapeoClientApi['createProject']>[0],
			) => {
				// Have to avoid passing `undefined` explicitly
				// See https://github.com/digidem/rpc-reflector/issues/21
				return opts ? clientApi.createProject(opts) : clientApi.createProject()
			},
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: getProjectsQueryKey(),
				})
			},
		}),
	)
}

/**
 * Leave an existing project.
 */
export function useLeaveProject() {
	const queryClient = useQueryClient()
	const clientApi = useClientApi()

	return filterMutationResult(
		useMutation({
			...baseMutationOptions(),
			mutationFn: async ({ projectId }: { projectId: string }) => {
				return clientApi.leaveProject(projectId)
			},
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: getProjectsQueryKey(),
				})
			},
		}),
	)
}

/**
 * Update the categories of a project using an external file.
 *
 * @param opts.projectId Public ID of the project to apply changes to.
 */
export function useImportProjectCategories({
	projectId,
}: {
	projectId: string
}) {
	const queryClient = useQueryClient()
	const { data: projectApi } = useSingleProject({ projectId })

	return filterMutationResult(
		useMutation({
			...baseMutationOptions(),
			mutationFn: ({ filePath }: { filePath: string }) => {
				return projectApi.$importCategories({ filePath })
			},
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: getProjectByIdQueryKey({ projectId }),
				})
			},
		}),
	)
}

/**
 * Update the configuration of a project using an external file.
 *
 * @deprecated Use `useImportProjectCategories` instead.
 * @param opts.projectId Public ID of the project to apply changes to.
 */
export function useImportProjectConfig({ projectId }: { projectId: string }) {
	const queryClient = useQueryClient()
	const { data: projectApi } = useSingleProject({ projectId })

	return filterMutationResult(
		useMutation({
			...baseMutationOptions(),
			mutationFn: ({ configPath }: { configPath: string }) => {
				return projectApi.importConfig({ configPath })
			},
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: getProjectByIdQueryKey({ projectId }),
				})
			},
		}),
	)
}

/**
 * Update the settings of a project.
 *
 * @param opts.projectId Public ID of the project to apply changes to.
 */
export function useUpdateProjectSettings({
	projectId,
}: {
	projectId: string
}): // NOTE: Needs explicit return type due to TS2742
FilteredMutationResult<
	UseMutationResult<
		EditableProjectSettings,
		Error,
		Partial<EditableProjectSettings>
	>
> {
	const queryClient = useQueryClient()
	const { data: projectApi } = useSingleProject({ projectId })

	return filterMutationResult(
		useMutation({
			...baseMutationOptions(),
			mutationFn: async (value: Partial<EditableProjectSettings>) => {
				return projectApi.$setProjectSettings(value)
			},
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: getProjectsQueryKey(),
				})
			},
		}),
	)
}

/**
 * Change a project member's role.
 *
 * @param opts.projectId Project public ID
 *
 * @example
 * ```tsx
 * function BasicExample() {
 *   const { mutate } = useChangeMemberRole({ projectId: '...' })
 *   // Use one of: COORDINATOR_ROLE_ID, MEMBER_ROLE_ID, BLOCKED_ROLE_ID
 *   mutate({ deviceId: '...', roleId: COORDINATOR_ROLE_ID })
 * }
 * ```
 */
export function useChangeMemberRole({ projectId }: { projectId: string }) {
	const queryClient = useQueryClient()
	const { data: projectApi } = useSingleProject({ projectId })

	return filterMutationResult(
		useMutation({
			...baseMutationOptions(),
			mutationFn: async ({
				deviceId,
				roleId,
			}: {
				deviceId: string
				roleId: MemberApi.RoleIdAssignableToOthers
			}) => {
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
		}),
	)
}

/**
 * Remove a member from a project, providing an optional reason for removal.
 *
 * Do NOT use this for removing your own device from a project. Use `useLeaveProject` instead.
 *
 * @param opts.projectId Project public ID
 *
 * @example
 * ```tsx
 * function BasicExample() {
 *   const { mutate } = useRemoveMember({ projectId: '...' })
 *   mutate({
 *     deviceId: '...',
 *     // Optional
 *     reason: '...',
 *   })
 * }
 * ```
 */
export function useRemoveMember({ projectId }: { projectId: string }) {
	const queryClient = useQueryClient()
	const { data: projectApi } = useSingleProject({ projectId })

	return filterMutationResult(
		useMutation({
			...baseMutationOptions(),
			mutationFn: async ({
				deviceId,
				reason,
			}: {
				deviceId: string
				reason?: string
			}) => {
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
		}),
	)
}

/**
 * Set up listener for changes to your own role in a project.
 * It is necessary to use this if you want the project role-related read hooks to update
 * based on role change events that are received in the background.
 *
 *
 *
 * @example
 * ```tsx
 * function ListenerComponent({ projectId }: { projectId: string }) {
 *   // Set up the listener
 *   useProjectOwnRoleChangeListener({ projectId })
 * }
 *
 * // Handle role change events separately
 * function EventHandlerComponent() {
 *   const { data: projectApi } = useSingleProject({ projectId })
 *
 *   useEffect(() => {
 *     function handleRoleChangeEvent(event) {
 * 	     // Do something with event...
 *     }
 *
 *     projectApi.addListener('own-role-change', handleRoleChangeEvent)
 *
 *     return () => {
 *       projectApi.removeListener('own-role-change', handleRoleChangeEvent)
 *     }
 *   }, [projectApi])
 * }
 * ```
 */
export function useProjectOwnRoleChangeListener({
	projectId,
}: {
	projectId: string
}) {
	const queryClient = useQueryClient()
	const { data: projectApi } = useSingleProject({ projectId })

	useEffect(() => {
		function invalidateCache() {
			queryClient.invalidateQueries({
				queryKey: getMembersQueryKey({ projectId }),
			})
			queryClient.invalidateQueries({
				queryKey: getProjectRoleQueryKey({ projectId }),
			})
		}

		projectApi.addListener('own-role-change', invalidateCache)

		return () => {
			projectApi.removeListener('own-role-change', invalidateCache)
		}
	}, [projectApi, queryClient, projectId])
}

/**
 * Create a blob for a project.
 *
 * @param opts.projectId Public project ID of project to apply to changes to.
 */
export function useCreateBlob({ projectId }: { projectId: string }) {
	const { data: projectApi } = useSingleProject({ projectId })

	return filterMutationResult(
		useMutation({
			...baseMutationOptions(),
			mutationFn: async ({
				original,
				preview,
				thumbnail,
				metadata,
			}: {
				original: string
				preview?: string
				thumbnail?: string
				metadata: BlobApi.Metadata
			}) => {
				return projectApi.$blobs.create(
					{ original, preview, thumbnail },
					metadata,
				)
			},
		}),
	)
}

const PROJECT_SYNC_STORE_MAP = new WeakMap<MapeoProjectApi, SyncStore>()

function useSyncStore({ projectId }: { projectId: string }) {
	const { data: projectApi } = useSingleProject({ projectId })

	let syncStore = PROJECT_SYNC_STORE_MAP.get(projectApi)

	if (!syncStore) {
		syncStore = new SyncStore(projectApi)
		PROJECT_SYNC_STORE_MAP.set(projectApi, syncStore)
	}

	return syncStore
}

/**
 * Hook to subscribe to the current sync state.
 *
 * Creates a global singleton for each project, to minimize traffic over IPC -
 * this hook can safely be used in more than one place without attaching
 * additional listeners across the IPC channel.
 *
 * @example
 * ```ts
 * function Example() {
 *     const syncState = useSyncState({ projectId });
 *
 *     if (!syncState) {
 *         // Sync information hasn't been loaded yet
 *     }
 *
 *     // Actual info about sync state is available...
 * }
 * ```
 *
 * @param opts.projectId Project public ID
 */
export function useSyncState({
	projectId,
}: {
	projectId: string
}): SyncState | null {
	const syncStore = useSyncStore({ projectId })

	const { subscribe, getStateSnapshot } = syncStore

	return useSyncExternalStore(subscribe, getStateSnapshot)
}

/**
 * Provides the progress of data sync for sync-enabled connected peers
 *
 * @returns `null` if no sync state events have been received. Otherwise returns a value between 0 and 1 (inclusive)
 */
export function useDataSyncProgress({
	projectId,
}: {
	projectId: string
}): number | null {
	const { subscribe, getDataProgressSnapshot } = useSyncStore({ projectId })
	return useSyncExternalStore(subscribe, getDataProgressSnapshot)
}

export function useStartSync({ projectId }: { projectId: string }) {
	const { data: projectApi } = useSingleProject({ projectId })

	return filterMutationResult(
		useMutation({
			...baseMutationOptions(),
			mutationFn: async (opts?: { autostopDataSyncAfter: number | null }) => {
				// Have to avoid passing `undefined` explicitly
				// See https://github.com/digidem/rpc-reflector/issues/21
				return opts ? projectApi.$sync.start(opts) : projectApi.$sync.start()
			},
		}),
	)
}

export function useStopSync({ projectId }: { projectId: string }) {
	const { data: projectApi } = useSingleProject({ projectId })

	return filterMutationResult(
		useMutation({
			...baseMutationOptions(),
			mutationFn: async () => {
				return projectApi.$sync.stop()
			},
		}),
	)
}

export function useConnectSyncServers({ projectId }: { projectId: string }) {
	const { data: projectApi } = useSingleProject({ projectId })

	return filterMutationResult(
		useMutation({
			...baseMutationOptions(),
			mutationFn: async () => {
				return projectApi.$sync.connectServers()
			},
		}),
	)
}

export function useDisconnectSyncServers({ projectId }: { projectId: string }) {
	const { data: projectApi } = useSingleProject({ projectId })

	return filterMutationResult(
		useMutation({
			...baseMutationOptions(),
			mutationFn: async () => {
				return projectApi.$sync.disconnectServers()
			},
		}),
	)
}

export function useSetAutostopDataSyncTimeout({
	projectId,
}: {
	projectId: string
}) {
	const { data: projectApi } = useSingleProject({ projectId })

	return filterMutationResult(
		useMutation({
			...baseMutationOptions(),
			mutationFn: async ({ after }: { after: number | null }) => {
				return projectApi.$sync.setAutostopDataSyncTimeout(after)
			},
		}),
	)
}

/**
 * Creates a GeoJson file with all the observations and/or tracks in the project.
 *
 * @param opts.projectId Public ID of the project to apply changes to.
 */
export function useExportGeoJSON({ projectId }: { projectId: string }) {
	const { data: projectApi } = useSingleProject({ projectId })

	return filterMutationResult(
		useMutation({
			...baseMutationOptions(),
			mutationFn: async (opts: {
				path: string
				exportOptions: {
					observations?: boolean
					tracks?: boolean
					lang?: string
				}
			}) => {
				return projectApi.exportGeoJSONFile(opts.path, opts.exportOptions)
			},
		}),
	)
}

/**
 * Creates a zip file containing a GeoJson file with all the observations and/or tracks in the project and all associated attachments (photos and audio).
 *
 * @param opts.projectId Public ID of the project to apply changes to.
 */
export function useExportZipFile({ projectId }: { projectId: string }) {
	const { data: projectApi } = useSingleProject({ projectId })

	return filterMutationResult(
		useMutation({
			...baseMutationOptions(),
			mutationFn: async (opts: {
				path: string
				exportOptions: {
					observations?: boolean
					tracks?: boolean
					lang?: string
					attachments?: boolean
				}
			}) => {
				return projectApi.exportZipFile(opts.path, opts.exportOptions)
			},
		}),
	)
}

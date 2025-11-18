import type {
	BlobApi,
	IconApi,
} from '@comapeo/core' with { 'resolution-mode': 'import' }
import type { RoleChangeEvent } from '@comapeo/core/dist/mapeo-project.js' with { 'resolution-mode': 'import' }
import type { MapeoProjectApi } from '@comapeo/ipc' with { 'resolution-mode': 'import' }
import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from '@tanstack/react-query'
import { useEffect, useSyncExternalStore } from 'react'

import {
	addServerPeerMutationOptions,
	changeMemberRoleMutationOptions,
	closeMutationOptions,
	connectSyncServersMutationOptions,
	createBlobMutationOptions,
	createProjectMutationOptions,
	disconnectSyncServersMutationOptions,
	documentCreatedByQueryOptions,
	exportGeoJSONMutationOptions,
	exportZipFileMutationOptions,
	getMembersQueryKey,
	getProjectRoleQueryKey,
	importProjectCategoriesMutationOptions,
	importProjectConfigMutationOptions,
	leaveProjectMutationOptions,
	mediaServerOriginQueryOptions,
	projectByIdQueryOptions,
	projectMemberByIdQueryOptions,
	projectMembersQueryOptions,
	projectOwnRoleQueryOptions,
	projectSettingsQueryOptions,
	projectsQueryOptions,
	removeProjectMemberMutationOptions,
	removeServerPeerMutationOptions,
	setAutostopDataSyncTimeoutMutationOptions,
	startSyncMutationOptions,
	stopSyncMutationOptions,
	updateProjectSettingsMutationOptions,
} from '../lib/react-query/projects.js'
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
export function useSingleProject({ projectId }: { projectId: string }): {
	data: MapeoProjectApi
	error: Error | null
	isRefetching: boolean
} {
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

/**
 * @internal
 * Hack to retrieve the media server origin (protocol + host).
 */
function useMediaServerOrigin({ projectApi }: { projectApi: MapeoProjectApi }) {
	const { data, error, isRefetching } = useSuspenseQuery(
		mediaServerOriginQueryOptions({
			projectApi,
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
 *
 * @deprecated Use `createdBy` field from document read hooks.
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
export function useOwnRoleInProject({ projectId }: { projectId: string }) {
	const { data: projectApi } = useSingleProject({ projectId })

	const { data, error, isRefetching } = useSuspenseQuery(
		projectOwnRoleQueryOptions({ projectApi, projectId }),
	)

	return { data, error, isRefetching }
}

export function useAddServerPeer({ projectId }: { projectId: string }) {
	const queryClient = useQueryClient()
	const { data: projectApi } = useSingleProject({ projectId })

	const { error, mutate, mutateAsync, reset, status } = useMutation(
		addServerPeerMutationOptions({ projectApi, projectId, queryClient }),
	)

	return status === 'error'
		? { error, mutate, mutateAsync, reset, status }
		: { error: null, mutate, mutateAsync, reset, status }
}

export function useRemoveServerPeer({ projectId }: { projectId: string }) {
	const queryClient = useQueryClient()
	const { data: projectApi } = useSingleProject({ projectId })

	const { error, mutate, mutateAsync, reset, status } = useMutation(
		removeServerPeerMutationOptions({ projectApi, projectId, queryClient }),
	)

	return status === 'error'
		? { error, mutate, mutateAsync, reset, status }
		: { error: null, mutate, mutateAsync, reset, status }
}

/**
 * Create a new project.
 */
export function useCreateProject() {
	const queryClient = useQueryClient()
	const clientApi = useClientApi()

	const { error, mutate, mutateAsync, reset, status } = useMutation(
		createProjectMutationOptions({ clientApi, queryClient }),
	)

	return status === 'error'
		? { error, mutate, mutateAsync, reset, status }
		: { error: null, mutate, mutateAsync, reset, status }
}

/**
 * Leave an existing project.
 */
export function useLeaveProject() {
	const queryClient = useQueryClient()
	const clientApi = useClientApi()

	const { error, mutate, mutateAsync, reset, status } = useMutation(
		leaveProjectMutationOptions({ clientApi, queryClient }),
	)

	return status === 'error'
		? { error, mutate, mutateAsync, reset, status }
		: { error: null, mutate, mutateAsync, reset, status }
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

	const { error, mutate, mutateAsync, reset, status } = useMutation(
		importProjectCategoriesMutationOptions({
			queryClient,
			projectApi,
			projectId,
		}),
	)

	return status === 'error'
		? { error, mutate, mutateAsync, reset, status }
		: { error: null, mutate, mutateAsync, reset, status }
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

	const { error, mutate, mutateAsync, reset, status } = useMutation(
		importProjectConfigMutationOptions({ queryClient, projectApi, projectId }),
	)

	return status === 'error'
		? { error, mutate, mutateAsync, reset, status }
		: { error: null, mutate, mutateAsync, reset, status }
}

/**
 * Update the settings of a project.
 *
 * @param opts.projectId Public ID of the project to apply changes to.
 */
export function useUpdateProjectSettings({ projectId }: { projectId: string }) {
	const queryClient = useQueryClient()
	const { data: projectApi } = useSingleProject({ projectId })

	const { error, mutate, mutateAsync, reset, status } = useMutation(
		updateProjectSettingsMutationOptions({ projectApi, queryClient }),
	)

	return status === 'error'
		? { error, mutate, mutateAsync, reset, status }
		: { error: null, mutate, mutateAsync, reset, status }
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

	const { error, mutate, mutateAsync, reset, status } = useMutation(
		changeMemberRoleMutationOptions({ projectApi, projectId, queryClient }),
	)

	return status === 'error'
		? { error, mutate, mutateAsync, reset, status }
		: { error: null, mutate, mutateAsync, reset, status }
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

	const { error, mutate, mutateAsync, reset, status } = useMutation(
		removeProjectMemberMutationOptions({ projectId, projectApi, queryClient }),
	)

	return status === 'error'
		? { error, mutate, mutateAsync, reset, status }
		: { error: null, mutate, mutateAsync, reset, status }
}

/**
 * Set up listener for changes to your own role in a project.
 * It is necessary to use this if you want the project role-related read hooks to update
 * based on role change events that are received in the background.
 *
 * @param opts.listener Optional listener to invoke when role changes
 *
 * @example
 * ```tsx
 * function SomeComponent({ projectId }: { projectId: string }) {
 *   useProjectOwnRoleChangeListener({ projectId })
 * }
 * ```
 *
 * @example
 * ```tsx
 * function ComponentWithListener({ projectId }: { projectId: string }) {
 *   useProjectOwnRoleChangeListener({
 *     projectId,
 *     listener: (event) => {
 *       // Handle role change, e.g., navigate to default project
 *       console.log('New role:', event.role)
 *     }
 *   })
 * }
 * ```
 */
export function useProjectOwnRoleChangeListener({
	projectId,
	listener,
}: {
	projectId: string
	listener?: (event: RoleChangeEvent) => void
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

	useEffect(() => {
		if (listener) {
			projectApi.addListener('own-role-change', listener)
		}

		return () => {
			if (listener) {
				projectApi.removeListener('own-role-change', listener)
			}
		}
	}, [projectApi, listener])
}

/**
 * Create a blob for a project.
 *
 * @param opts.projectId Public project ID of project to apply to changes to.
 */
export function useCreateBlob({ projectId }: { projectId: string }) {
	const { data: projectApi } = useSingleProject({ projectId })

	const { error, mutate, mutateAsync, reset, status } = useMutation(
		createBlobMutationOptions({ projectApi }),
	)

	return status === 'error'
		? { error, mutate, mutateAsync, reset, status }
		: { error: null, mutate, mutateAsync, reset, status }
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

	const { error, mutate, mutateAsync, reset, status } = useMutation(
		startSyncMutationOptions({ projectApi }),
	)

	return status === 'error'
		? { error, mutate, mutateAsync, reset, status }
		: { error: null, mutate, mutateAsync, reset, status }
}

export function useStopSync({ projectId }: { projectId: string }) {
	const { data: projectApi } = useSingleProject({ projectId })

	const { error, mutate, mutateAsync, reset, status } = useMutation(
		stopSyncMutationOptions({ projectApi }),
	)

	return status === 'error'
		? { error, mutate, mutateAsync, reset, status }
		: { error: null, mutate, mutateAsync, reset, status }
}

export function useConnectSyncServers({ projectId }: { projectId: string }) {
	const { data: projectApi } = useSingleProject({ projectId })

	const { error, mutate, mutateAsync, reset, status } = useMutation(
		connectSyncServersMutationOptions({ projectApi }),
	)

	return status === 'error'
		? { error, mutate, mutateAsync, reset, status }
		: { error: null, mutate, mutateAsync, reset, status }
}

export function useDisconnectSyncServers({ projectId }: { projectId: string }) {
	const { data: projectApi } = useSingleProject({ projectId })

	const { error, mutate, mutateAsync, reset, status } = useMutation(
		disconnectSyncServersMutationOptions({ projectApi }),
	)

	return status === 'error'
		? { error, mutate, mutateAsync, reset, status }
		: { error: null, mutate, mutateAsync, reset, status }
}

export function useSetAutostopDataSyncTimeout({
	projectId,
}: {
	projectId: string
}) {
	const { data: projectApi } = useSingleProject({ projectId })

	const { error, mutate, mutateAsync, reset, status } = useMutation(
		setAutostopDataSyncTimeoutMutationOptions({ projectApi }),
	)

	return status === 'error'
		? { error, mutate, mutateAsync, reset, status }
		: { error: null, mutate, mutateAsync, reset, status }
}

/**
 * Creates a GeoJson file with all the observations and/or tracks in the project.
 *
 * @param opts.projectId Public ID of the project to apply changes to.
 */
export function useExportGeoJSON({ projectId }: { projectId: string }) {
	const { data: projectApi } = useSingleProject({ projectId })

	const { error, mutate, mutateAsync, reset, status } = useMutation(
		exportGeoJSONMutationOptions({ projectApi }),
	)

	return status === 'error'
		? { error, mutate, mutateAsync, reset, status }
		: { error: null, mutate, mutateAsync, reset, status }
}

/**
 * Creates a zip file containing a GeoJson file with all the observations and/or tracks in the project and all associated attachments (photos and audio).
 *
 * @param opts.projectId Public ID of the project to apply changes to.
 */
export function useExportZipFile({ projectId }: { projectId: string }) {
	const { data: projectApi } = useSingleProject({ projectId })

	const { error, mutate, mutateAsync, reset, status } = useMutation(
		exportZipFileMutationOptions({ projectApi }),
	)

	return status === 'error'
		? { error, mutate, mutateAsync, reset, status }
		: { error: null, mutate, mutateAsync, reset, status }
}

/**
 * Closes the project.
 *
 * After doing this, any subsequent usage of the project instance will not work.
 * Note that mounted read hooks that make use of the affected project instance will attempt to refetch,
 * triggering an update to the `isRefetching` field and eventually populating the `error` field, while the `data`
 * field will represent the last successful read. As per React Query default behavior, this will not cause wrapping suspense boundaries
 * or error boundaries to be triggered by default. In general, it is up to the consumer of the hooks to handle these states where the hooks are used
 * (see example).
 *
 * @example
 * ```ts
 * function Example() {
 *     const closeProject = useCloseProject({ projectId });
 *
 *     function handleClick() {
 *       closeProject.mutate(undefined, {
 *           onSuccess: () => {
 *                // Do something like navigate to a different page
 *           }
 *       })
 *     }
 * }
 * ```
 *
 * @example
 * ```tsx
 * function ErrorHandlingExample({ projectId }: { projetId: string }) {
 *   const { data, isRefetching, error } = useManyDocs({ projectId, docType: 'observation' })
 *
 *   const closeProject = useCloseProject({ projectId })
 *
 *   return (
 *     <div>
 *       {isRefetching ? <SomeFetchingIndicator /> : error ? <SomeErrorIndicator /> : null}
 *
 *       <ul>
 *         {\/* When `error` is `null`, this data represents the last successful read! (standard React Query behavior) *\/}
 *         {data.map(d => <li key={d.docId}>Observation document ID: {d.docId}</li>)}
 *       </ul>
 *
 *       <button
 *           onClick={() => {
 *               closeProject.mutate(undefined)
 *           }}
 *       >
 *          Close project
 *       </button>
 *     </div>
 *   )
 * }
 * ```
 *
 * @param opts.projectId Public ID of the project to close.
 */
export function useCloseProject({ projectId }: { projectId: string }) {
	const queryClient = useQueryClient()

	const { data: projectApi } = useSingleProject({ projectId })

	const { error, mutate, mutateAsync, reset, status } = useMutation(
		closeMutationOptions({ projectApi, queryClient }),
	)

	return status === 'error'
		? { error, mutate, mutateAsync, reset, status }
		: { error: null, mutate, mutateAsync, reset, status }
}

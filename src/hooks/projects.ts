import type {
	BlobApi,
	IconApi,
} from '@comapeo/core' with { 'resolution-mode': 'import' }
import type { MapeoProjectApi } from '@comapeo/ipc' with { 'resolution-mode': 'import' }
import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'

import {
	addServerPeerMutationOptions,
	connectSyncServersMutationOptions,
	createBlobMutationOptions,
	createProjectMutationOptions,
	disconnectSyncServersMutationOptions,
	documentCreatedByQueryOptions,
	exportGeoJSONMutationOptions,
	exportZipFileMutationOptions,
	importProjectConfigMutationOptions,
	leaveProjectMutationOptions,
	mediaServerOriginQueryOptions,
	projectByIdQueryOptions,
	projectMemberByIdQueryOptions,
	projectMembersQueryOptions,
	projectOwnRoleQueryOptions,
	projectSettingsQueryOptions,
	projectsQueryOptions,
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
 * Update the configuration of a project using an external file.
 *
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

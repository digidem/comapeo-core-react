import type { MapeoClientApi, MapeoProjectApi } from '@comapeo/ipc'
import type { QueryClient } from '@tanstack/react-query'

import { isArchiveDeviceQueryOptions } from './client.js'
import {
	projectByIdQueryOptions,
	projectMembersQueryOptions,
	projectOwnRoleQueryOptions,
	projectSettingsQueryOptions,
	projectsQueryOptions,
} from './projects.js'

/**
 * Prefetch project list into the React Query cache.
 *
 * @param queryClient React Query client instance
 * @param clientApi CoMapeo Client API instance
 *
 * @example
 * ```tsx
 *
 * function MenuScreen() {
 *   const queryClient = useQueryClient()
 *   const clientApi = useClientApi()
 *
 *   useFocusEffect(
 *     React.useCallback(() => {
 *       prefetchProjects(queryClient, clientApi)
 *     }, [queryClient, clientApi])
 *   )
 *
 *   return <UI />
 * }
 * ```
 */
export async function prefetchProjects(
	queryClient: QueryClient,
	clientApi: MapeoClientApi,
): Promise<void> {
	const opts = projectsQueryOptions({ clientApi })
	await queryClient.prefetchQuery({ ...opts, staleTime: Infinity })
}

/**
 * Ensure the project API instance is cached and available.
 *
 * Returns the project API handle if available.
 *
 * @param queryClient React Query client instance
 * @param clientApi CoMapeo Client API instance
 * @param projectId Project public ID
 *
 * @example
 * ```tsx
 * const projectApi = await prefetchProjectApi(queryClient, clientApi, projectId)
 * if (!projectApi) {
 *   // Project not found or failed to load; handle gracefully
 * }
 * ```
 */
export async function prefetchProjectApi(
	queryClient: QueryClient,
	clientApi: MapeoClientApi,
	projectId: string,
): Promise<MapeoProjectApi | undefined> {
	try {
		const opts = projectByIdQueryOptions({ clientApi, projectId })
		const api = await queryClient.ensureQueryData({
			...opts,
			staleTime: Infinity,
		})
		return api
	} catch {
		return undefined
	}
}

/**
 * Prefetch project settings for a project.
 *
 * @param queryClient React Query client instance
 * @param clientApi CoMapeo Client API instance
 * @param projectId Project public ID
 *
 * @example
 * ```tsx
 * await prefetchProjectSettings(queryClient, clientApi, projectId)
 * ```
 */
export async function prefetchProjectSettings(
	queryClient: QueryClient,
	clientApi: MapeoClientApi,
	projectId: string,
): Promise<void> {
	const projectApi = await prefetchProjectApi(queryClient, clientApi, projectId)
	if (!projectApi) return
	const opts = projectSettingsQueryOptions({ projectApi, projectId })
	await queryClient.prefetchQuery({ ...opts, staleTime: Infinity })
}

/**
 * Prefetch the current device's role in a project.
 *
 * @param queryClient React Query client instance
 * @param clientApi CoMapeo Client API instance
 * @param projectId Project public ID
 *
 * @example
 * ```tsx
 * await prefetchOwnRoleInProject(queryClient, clientApi, projectId)
 * ```
 */
export async function prefetchOwnRoleInProject(
	queryClient: QueryClient,
	clientApi: MapeoClientApi,
	projectId: string,
): Promise<void> {
	const projectApi = await prefetchProjectApi(queryClient, clientApi, projectId)
	if (!projectApi) return
	const opts = projectOwnRoleQueryOptions({ projectApi, projectId })
	await queryClient.prefetchQuery({ ...opts, staleTime: Infinity })
}

/**
 * Prefetch all members for a project.
 *
 * @param queryClient React Query client instance
 * @param clientApi CoMapeo Client API instance
 * @param projectId Project public ID
 *
 * @example
 * ```tsx
 * await prefetchMembers(queryClient, clientApi, projectId)
 * ```
 */
export async function prefetchMembers(
	queryClient: QueryClient,
	clientApi: MapeoClientApi,
	projectId: string,
): Promise<void> {
	const projectApi = await prefetchProjectApi(queryClient, clientApi, projectId)
	if (!projectApi) return
	const opts = projectMembersQueryOptions({ projectApi, projectId })
	await queryClient.prefetchQuery({ ...opts, staleTime: Infinity })
}

/**
 * Prefetch whether the current device is an archive device.
 *
 * @param queryClient React Query client instance
 * @param clientApi CoMapeo Client API instance
 *
 * @example
 * ```tsx
 * await prefetchIsArchiveDevice(queryClient, clientApi)
 * ```
 */
export async function prefetchIsArchiveDevice(
	queryClient: QueryClient,
	clientApi: MapeoClientApi,
): Promise<void> {
	const opts = isArchiveDeviceQueryOptions({ clientApi })
	await queryClient.prefetchQuery({ ...opts, staleTime: Infinity })
}

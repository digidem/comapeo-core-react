import type { MapeoClientApi, MapeoProjectApi } from '@comapeo/ipc'
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import { useClientApi as useClientApi } from './client-api.js'

// TODO: use symbols?
const PROJECTS = 'projects'
const SETTINGS = 'settings'
const MEMBERS = 'members'
const CREATE = 'create'
const FIELDS = 'fields'

export function allProjectsQueryKey() {
  return [PROJECTS] as const
}
export function projectQueryKey(projectId: string) {
  return [PROJECTS, projectId] as const
}
export function projectSettingsQueryKey(projectId: string) {
  return [PROJECTS, projectId, SETTINGS] as const
}
export function projectMembersQueryKey(projectId: string) {
  return [PROJECTS, projectId, MEMBERS] as const
}
export function createdByToDeviceIdQueryKey(
  projectId: string,
  createdBy: string,
) {
  return [PROJECTS, projectId, createdBy] as const
}
export function projectFieldsQueryKey(projectId: string) {
  return [PROJECTS, projectId, FIELDS] as const
}

// Queries
export function allProjectsQueryOptions(opts: { clientApi: MapeoClientApi }) {
  return queryOptions({
    queryKey: allProjectsQueryKey(),
    queryFn: () => {
      return opts.clientApi.listProjects()
    },
  })
}
export function useAllProjects() {
  const clientApi = useClientApi()
  return useQuery(allProjectsQueryOptions({ clientApi }))
}
useAllProjects.queryKey = allProjectsQueryKey

export function projectQueryOptions(opts: {
  clientApi: MapeoClientApi
  projectId: string
}) {
  return queryOptions({
    queryKey: projectQueryKey(opts.projectId),
    queryFn: () => {
      return opts.clientApi.getProject(opts.projectId)
    },
  })
}

export function useProject(opts: { projectId: string }) {
  const clientApi = useClientApi()
  return useQuery(projectQueryOptions({ clientApi, projectId: opts.projectId }))
}

export function projectSettingsQueryOptions(opts: {
  projectApi: MapeoProjectApi
  projectId: string
}) {
  return queryOptions({
    queryKey: projectSettingsQueryKey(opts.projectId),
    queryFn: () => {
      return opts.projectApi.$getProjectSettings()
    },
  })
}
export function useProjectSettings(opts: {
  projectApi: MapeoProjectApi
  projectId: string
}) {
  return useQuery(projectSettingsQueryOptions(opts))
}

export function projectMembersQueryOptions(opts: {
  projectApi: MapeoProjectApi
  projectId: string
}) {
  return queryOptions({
    queryKey: projectMembersQueryKey(opts.projectId),
    queryFn: () => {
      return opts.projectApi.$member.getMany()
    },
  })
}
export function useProjectMembers(opts: {
  projectApi: MapeoProjectApi
  projectId: string
}) {
  return useQuery(projectMembersQueryOptions(opts))
}

export function createdByToDeviceIdQueryOptions(opts: {
  projectApi: MapeoProjectApi
  projectId: string
  createdBy: string
}) {
  return queryOptions({
    queryKey: createdByToDeviceIdQueryKey(opts.projectId, opts.createdBy),
    queryFn: () => {
      return opts.projectApi.$originalVersionIdToDeviceId(opts.createdBy)
    },
  })
}
export function useCreatedByToDeviceId(opts: {
  projectApi: MapeoProjectApi
  projectId: string
  createdBy: string
}) {
  return useQuery(createdByToDeviceIdQueryOptions(opts))
}

export function projectFieldsQueryOptions(opts: {
  projectApi: MapeoProjectApi
  projectId: string
}) {
  return queryOptions({
    queryKey: projectFieldsQueryKey(opts.projectId),
    queryFn: () => {
      return opts.projectApi.field.getMany()
    },
  })
}
export function useProjectFields(opts: {
  projectApi: MapeoProjectApi
  projectId: string
}) {
  return useQuery(projectFieldsQueryOptions(opts))
}

// Mutations

export function useCreateProject() {
  const queryClient = useQueryClient()

  const api = useClientApi()

  return useMutation({
    mutationKey: [PROJECTS, CREATE],
    mutationFn: (opts?: { name?: string; configPath?: string }) => {
      if (opts) {
        return api.createProject(opts)
      } else {
        // Have to avoid passing `undefined` explicitly due to potential serialization
        // limitations depending on how the client api is set up.
        // See https://github.com/digidem/comapeo-mobile/issues/392
        return api.createProject()
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: allProjectsQueryKey(),
      })
    },
  })
}

export function useLeaveProject() {
  const queryClient = useQueryClient()
  const mapeoApi = useClientApi()

  return useMutation({
    mutationFn: (opts: { projectId: string }) => {
      return mapeoApi.leaveProject(opts.projectId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: allProjectsQueryKey(),
      })
    },
  })
}

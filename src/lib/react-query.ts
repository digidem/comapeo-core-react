import { DEFAULT_MAP_ID } from '@comapeo/map-server'
import type {
	QueryClient,
	QueryOptions,
	UseMutationOptions,
} from '@tanstack/react-query'

import type { WriteableDocumentType } from './types.js'

// #region Shared

const ROOT_QUERY_KEY = '@comapeo/core-react'

// Since the API is running locally, queries should run regardless of network
// status, and should not be retried. In React Native the API consumer would
// have to manually set the network mode, but we still should keep these options
// to avoid surprises. Not using the queryClient `defaultOptions` because the API
// consumer might also use the same queryClient for network queries
export function baseQueryOptions() {
	return {
		networkMode: 'always',
		retry: false,
	} satisfies QueryOptions
}

export function baseMutationOptions() {
	return {
		networkMode: 'always',
		retry: false,
	} satisfies UseMutationOptions
}
// #endregion

// #region Client

function getClientQueryKey() {
	return [ROOT_QUERY_KEY, 'client'] as const
}

export function getDeviceInfoQueryKey() {
	return [...getClientQueryKey(), 'device_info'] as const
}

export function getIsArchiveDeviceQueryKey() {
	return [...getClientQueryKey(), 'is_archive_device'] as const
}

// #endregion

// #region Invites

export function getInvitesQueryKey() {
	return [ROOT_QUERY_KEY, 'invites'] as const
}

export function getInvitesByIdQueryKey({ inviteId }: { inviteId: string }) {
	return [ROOT_QUERY_KEY, 'invites', { inviteId }] as const
}

// #endregion

// #region Maps

const MAPS_ROOT_QUERY_KEY = [ROOT_QUERY_KEY, 'maps'] as const

export function getMapQueryKey({ mapId }: { mapId: string }) {
	return [...MAPS_ROOT_QUERY_KEY, mapId] as const
}

export function getMapInfoQueryKey({ mapId }: { mapId: string }) {
	return [...getMapQueryKey({ mapId }), 'info'] as const
}

export function getStyleJsonUrlQueryKey({ mapId }: { mapId: string }) {
	return [...getMapQueryKey({ mapId }), 'stylejson_url'] as const
}

/**
 * Invalidate queries for this map and the default map (which internally
 * redirects to custom) so that they will be refetched with the new map data.
 */
export async function invalidateMapQueries(
	queryClient: QueryClient,
	{ mapId }: { mapId: string },
) {
	await Promise.all([
		queryClient.invalidateQueries({
			queryKey: getMapQueryKey({ mapId }),
		}),
		queryClient.invalidateQueries({
			queryKey: getMapQueryKey({ mapId: DEFAULT_MAP_ID }),
		}),
	])
}

// #endregion

// #region Projects

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

export function getMembersQueryKey({
	projectId,
	includeLeft,
}: {
	projectId: string
	includeLeft?: boolean
}) {
	return [
		ROOT_QUERY_KEY,
		'projects',
		projectId,
		'members',
		{ includeLeft },
	] as const
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

// #endregion

// #region Documents

export function getDocumentsQueryKey<D extends WriteableDocumentType>({
	projectId,
	docType,
}: {
	projectId: string
	docType: D
}) {
	return [ROOT_QUERY_KEY, 'projects', projectId, docType] as const
}

export function getManyDocumentsQueryKey<D extends WriteableDocumentType>({
	projectId,
	docType,
	includeDeleted,
	lang,
}: {
	projectId: string
	docType: D
	includeDeleted?: boolean
	lang?: string
}) {
	return [
		ROOT_QUERY_KEY,
		'projects',
		projectId,
		docType,
		{ includeDeleted, lang },
	] as const
}

export function getDocumentByDocIdQueryKey<D extends WriteableDocumentType>({
	projectId,
	docType,
	docId,
	lang,
}: {
	projectId: string
	docType: D
	docId: string
	lang?: string
}) {
	return [
		ROOT_QUERY_KEY,
		'projects',
		projectId,
		docType,
		docId,
		{ lang },
	] as const
}

export function getDocumentByVersionIdQueryKey<
	D extends WriteableDocumentType,
>({
	projectId,
	docType,
	versionId,
	lang,
}: {
	projectId: string
	docType: D
	versionId: string
	lang?: string
}) {
	return [
		ROOT_QUERY_KEY,
		'projects',
		projectId,
		docType,
		versionId,
		{ lang },
	] as const
}

// #endregion

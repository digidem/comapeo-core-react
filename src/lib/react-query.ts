import { DEFAULT_MAP_ID } from '@comapeo/map-server/constants.js'
import type {
	QueryClient,
	QueryOptions,
	UseMutationOptions,
	UseMutationResult,
	UseQueryResult,
} from '@tanstack/react-query'
import { DistributedPick } from 'type-fest'

import { refreshActiveSyncStores } from './sync.js'
import type { WriteableDocumentType } from './types.js'

// #region Shared

const ROOT_QUERY_KEY = '@comapeo/core-react'

/**
 * Prefix shared by every query key owned by this package. Matching on it
 * targets all of our caches without touching queries owned by the consuming
 * app, which may share the same `QueryClient`.
 */
export function getRootQueryKey() {
	return [ROOT_QUERY_KEY] as const
}

/**
 * A call that was in flight when the RPC transport to the backend dropped
 * rejects with this code — rpc-reflector's `ChannelClosedError`, re-exported by
 * `@comapeo/ipc` as `RpcChannelClosedError` and used both when the client is
 * closed and when the transport owner reports a reset. The response will never
 * arrive, but the call was a read, so re-issuing it is safe — and on platforms
 * where the backend restarts in place (Android), the retried call waits in the
 * transport's send queue until the new backend is up, turning an error flash
 * into continued loading. Matched by `code` rather than `instanceof` so a
 * duplicated copy of `@comapeo/ipc` in the dependency tree cannot break the
 * check.
 */
const CHANNEL_CLOSED_CODE = 'RPC_CHANNEL_CLOSED'

/**
 * A project this device has left rejects every call with this code until it is
 * re-joined via an invite, so retrying only re-rejects.
 */
const PROJECT_LEFT_CODE = 'PROJECT_LEFT'

const CHANNEL_CLOSED_RETRY_LIMIT = 3
const CHANNEL_CLOSED_RETRY_DELAY_MS = 1_000

function getErrorCode(error: unknown): unknown {
	return typeof error === 'object' && error !== null && 'code' in error
		? error.code
		: undefined
}

function shouldRetryQuery(failureCount: number, error: unknown): boolean {
	if (failureCount >= CHANNEL_CLOSED_RETRY_LIMIT) return false
	const code = getErrorCode(error)
	if (code === PROJECT_LEFT_CODE) return false
	return code === CHANNEL_CLOSED_CODE
}

// Since the API is running locally, queries should run regardless of network
// status, and should not be retried — with one exception: a channel-closed
// rejection (the transport to the backend dropped under the call) is retried a
// bounded number of times, see `shouldRetryQuery`. Mutations are never retried:
// re-issuing a write whose response was lost is not safe. In React Native the
// API consumer would have to manually set the network mode, but we still
// should keep these options to avoid surprises. Not using the queryClient
// `defaultOptions` because the API consumer might also use the same
// queryClient for network queries — and because these per-hook options would
// override a client-level default anyway.
export function baseQueryOptions() {
	return {
		networkMode: 'always',
		// Param typed as the registered `Error` default so TError inference in
		// the hooks is unaffected; the guard itself narrows from unknown.
		retry: (failureCount: number, error: Error) =>
			shouldRetryQuery(failureCount, error),
		retryDelay: CHANNEL_CLOSED_RETRY_DELAY_MS,
	} satisfies QueryOptions
}

export function baseMutationOptions() {
	return {
		networkMode: 'always',
		retry: false,
	} satisfies UseMutationOptions
}

const PICKED_MUTATION_RESULT_KEYS = [
	'error',
	'mutate',
	'mutateAsync',
	'reset',
	'status',
] as const satisfies ReadonlyArray<keyof UseMutationResult>

export type FilteredMutationResult<
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	TResult extends UseMutationResult<any, any, any, any>,
> = DistributedPick<TResult, (typeof PICKED_MUTATION_RESULT_KEYS)[number]>

/**
 * Filters a `UseMutationResult` to only include a subset of its keys, and uses
 * `DistributedPick` to preserve the discriminated union types of the mutation
 * result based on the `status` property.
 */
export function filterMutationResult<
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	TResult extends UseMutationResult<any, any, any, any>,
>(mutationResult: TResult) {
	const filteredResult = {} as FilteredMutationResult<TResult>
	for (const key of PICKED_MUTATION_RESULT_KEYS) {
		filteredResult[key] = mutationResult[key]
	}
	return filteredResult
}

const PICKED_QUERY_RESULT_KEYS = [
	'data',
	'error',
	'isRefetching',
	'status',
] as const satisfies ReadonlyArray<keyof UseQueryResult>

export type FilteredQueryResult<
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	TResult extends UseQueryResult<any, any>,
> = DistributedPick<TResult, (typeof PICKED_QUERY_RESULT_KEYS)[number]>

export function filterQueryResult<
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	TResult extends UseQueryResult<any, any>,
>(queryResult: TResult) {
	const filteredResult = {} as FilteredQueryResult<TResult>
	for (const key of PICKED_QUERY_RESULT_KEYS) {
		filteredResult[key] = queryResult[key]
	}
	return filteredResult
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
	return includeLeft === undefined
		? ([ROOT_QUERY_KEY, 'projects', projectId, 'members'] as const)
		: ([
				ROOT_QUERY_KEY,
				'projects',
				projectId,
				'members',
				{ includeLeft },
			] as const)
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

// #region Backend restart

const PROJECT_INSTANCE_QUERY_KEY_LENGTH = getProjectByIdQueryKey({
	projectId: '',
}).length

function hasPrefix(
	queryKey: ReadonlyArray<unknown>,
	prefix: ReadonlyArray<unknown>,
) {
	return prefix.every((segment, index) => queryKey[index] === segment)
}

function isProjectScopedQueryKey(queryKey: ReadonlyArray<unknown>) {
	return hasPrefix(queryKey, getProjectsQueryKey())
}

/**
 * Queries whose data was read through a `ComapeoProjectClientApi` instance, and
 * so describes the backend that has gone: everything nested below
 * `projects/<projectId>`, plus the media server origin, which is keyed outside
 * the project namespace but is read from a project instance.
 *
 * `document_created_by` is content-addressed, so its data survives a restart,
 * but it is dropped with the rest rather than carved out — re-reading an
 * immutable mapping is cheaper than the exception.
 */
function isBoundToProjectInstance(queryKey: ReadonlyArray<unknown>) {
	return (
		hasPrefix(queryKey, getMediaServerOriginQueryKey()) ||
		(isProjectScopedQueryKey(queryKey) &&
			queryKey.length > PROJECT_INSTANCE_QUERY_KEY_LENGTH)
	)
}

function isProjectInstanceQueryKey(queryKey: ReadonlyArray<unknown>) {
	return (
		isProjectScopedQueryKey(queryKey) &&
		queryKey.length === PROJECT_INSTANCE_QUERY_KEY_LENGTH
	)
}

/**
 * Drop what a backend restart made stale and get mounted components reading
 * from the new backend.
 *
 * The references themselves survive: the client API is unaffected, and a
 * project reference is permanent (`@comapeo/ipc` v10) — its channel re-opens
 * against the restarted backend on the next call. What does not survive is what
 * was read through them. The media server comes back on a different port, and
 * everything the backend held in memory is gone.
 *
 * Each of the four steps does something the others cannot:
 *
 * 1. `removeQueries` for everything read through a project instance. Removal
 *    rather than invalidation, because the media server origin is cached with
 *    `staleTime: 'static'`, which invalidation skips structurally — so it would
 *    otherwise hand out URLs for the dead port for the life of the app. Removal
 *    also guarantees that a query which failed as the old backend went away
 *    cannot stay latched in `status: 'error'`, which `shouldFetchOptionally` in
 *    query-core never retries for a `useSuspenseQuery`.
 * 2. `resetQueries` for the project instance queries. Removal is invisible to a
 *    mounted observer — it keeps rendering its last result indefinitely because
 *    nothing dispatches a state change — whereas resetting does dispatch, so
 *    components suspend on `useSingleProject` and rebuild and refetch the
 *    queries removed in step 1. The `queryFn` here calls
 *    `clientApi.getProject()`, which is safe to re-run: it resolves the same
 *    permanent reference without a wire round trip.
 * 3. `invalidateQueries` for the remainder: manager-level data such as device
 *    info, invites and the project list, all read through the client API. A
 *    background refetch is enough, and avoids a loading state.
 * 4. `refreshActiveSyncStores` for the sync state, which is an external store
 *    rather than a query, keyed on the project reference. Because that
 *    reference is permanent, step 2 hands back the same store, so nothing else
 *    would drop the state and error it holds from the previous backend.
 */
export function resetQueriesAfterBackendRestart(queryClient: QueryClient) {
	queryClient.removeQueries({
		queryKey: getRootQueryKey(),
		predicate: (query) => isBoundToProjectInstance(query.queryKey),
	})
	queryClient.resetQueries({
		queryKey: getRootQueryKey(),
		predicate: (query) => isProjectInstanceQueryKey(query.queryKey),
	})
	queryClient.invalidateQueries({ queryKey: getRootQueryKey() })
	refreshActiveSyncStores()
}

// #endregion

import type { MapeoProjectApi } from '@comapeo/ipc' with { 'resolution-mode': 'import' }
import type {
	MapeoDoc,
	MapeoValue,
} from '@comapeo/schema' with { 'resolution-mode': 'import' }
import {
	queryOptions,
	type QueryClient,
	type UseMutationOptions,
} from '@tanstack/react-query'

import {
	baseMutationOptions,
	baseQueryOptions,
	ROOT_QUERY_KEY,
} from './shared.js'

export type WriteableDocumentType = Extract<
	MapeoDoc['schemaName'],
	'field' | 'observation' | 'preset' | 'track' | 'remoteDetectionAlert'
>
export type WriteableValue<D extends WriteableDocumentType> = Extract<
	MapeoValue,
	{ schemaName: D }
>
export type WriteableDocument<D extends WriteableDocumentType> = Extract<
	MapeoDoc,
	{ schemaName: D }
>

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

export function documentsQueryOptions<D extends WriteableDocumentType>({
	projectApi,
	projectId,
	docType,
	includeDeleted,
	lang,
}: {
	projectApi: MapeoProjectApi
	projectId: string
	docType: D
	includeDeleted?: boolean
	lang?: string
}) {
	return queryOptions({
		...baseQueryOptions(),
		queryKey: getManyDocumentsQueryKey({
			projectId,
			docType,
			includeDeleted,
			lang,
		}),
		queryFn: async () => {
			return projectApi[docType].getMany({
				includeDeleted,
				lang,
			})
		},
	})
}

export function documentByDocumentIdQueryOptions<
	D extends WriteableDocumentType,
>({
	projectApi,
	projectId,
	docType,
	docId,
	lang,
}: {
	projectApi: MapeoProjectApi
	projectId: string
	docType: D
	docId: string
	lang?: string
}) {
	return queryOptions({
		...baseQueryOptions(),
		queryKey: getDocumentByDocIdQueryKey({
			projectId,
			docType,
			docId,
			lang,
		}),
		queryFn: async () => {
			return projectApi[docType].getByDocId(docId, {
				lang,
				// We want to make sure that this throws in the case that no match is found
				mustBeFound: true,
			})
		},
	})
}

export function documentByVersionIdQueryOptions<
	D extends WriteableDocumentType,
>({
	projectApi,
	projectId,
	docType,
	versionId,
	lang,
}: {
	projectApi: MapeoProjectApi
	projectId: string
	docType: D
	versionId: string
	lang?: string
}) {
	return queryOptions({
		...baseQueryOptions(),
		queryKey: getDocumentByVersionIdQueryKey({
			projectId,
			docType,
			versionId,
			lang,
		}),
		queryFn: async () => {
			return projectApi[docType].getByVersionId(versionId, { lang })
		},
	})
}

export function createDocumentMutationOptions<D extends WriteableDocumentType>({
	docType,
	projectApi,
	projectId,
	queryClient,
}: {
	docType: D
	projectApi: MapeoProjectApi
	projectId: string
	queryClient: QueryClient
}) {
	return {
		...baseMutationOptions(),
		mutationFn: async ({
			value,
		}): Promise<WriteableDocument<D> & { forks: Array<string> }> => {
			// @ts-expect-error TS not handling this well
			return projectApi[docType].create({
				...value,
				schemaName: docType,
			})
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: getDocumentsQueryKey({
					projectId,
					docType,
				}),
			})
		},
	} satisfies UseMutationOptions<
		WriteableDocument<D> & { forks: Array<string> },
		Error,
		{ value: Omit<WriteableValue<D>, 'schemaName'> }
	>
}

export function updateDocumentMutationOptions<D extends WriteableDocumentType>({
	docType,
	projectApi,
	projectId,
	queryClient,
}: {
	docType: D
	projectApi: MapeoProjectApi
	projectId: string
	queryClient: QueryClient
}) {
	return {
		...baseMutationOptions(),
		mutationFn: async ({
			versionId,
			value,
		}): Promise<WriteableDocument<D> & { forks: Array<string> }> => {
			// @ts-expect-error TS not handling this well
			return projectApi[docType].update(versionId, value)
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: getDocumentsQueryKey({
					projectId,
					docType,
				}),
			})
		},
	} satisfies UseMutationOptions<
		WriteableDocument<D> & { forks: Array<string> },
		Error,
		{ versionId: string; value: Omit<WriteableValue<D>, 'schemaName'> }
	>
}

export function deleteDocumentMutationOptions<D extends WriteableDocumentType>({
	docType,
	projectApi,
	projectId,
	queryClient,
}: {
	docType: D
	projectApi: MapeoProjectApi
	projectId: string
	queryClient: QueryClient
}) {
	return {
		...baseMutationOptions(),
		mutationFn: async ({
			docId,
		}): Promise<WriteableDocument<D> & { forks: Array<string> }> => {
			// @ts-expect-error TS not handling this well
			return projectApi[docType].delete(docId)
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: getDocumentsQueryKey({
					projectId,
					docType,
				}),
			})
		},
	} satisfies UseMutationOptions<
		WriteableDocument<D> & { forks: Array<string> },
		Error,
		{ docId: string }
	>
}

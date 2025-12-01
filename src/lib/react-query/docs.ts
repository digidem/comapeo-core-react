import type { DerivedDocFields } from '@comapeo/core/dist/datatype/index.js' with {
	'resolution-mode': 'import',
}
import type { MapeoProjectApi } from '@comapeo/ipc' with {
	'resolution-mode': 'import',
}
import {
	queryOptions,
	type QueryClient,
	type UseMutationOptions,
} from '@tanstack/react-query'

import type {
	WriteableDoc,
	WriteableDocType,
	WriteableValue,
} from '../types.js'
import {
	baseMutationOptions,
	baseQueryOptions,
	ROOT_QUERY_KEY,
} from './shared.js'

export function getDocsQueryKey<D extends WriteableDocType>({
	projectId,
	docType,
}: {
	projectId: string
	docType: D
}) {
	return [ROOT_QUERY_KEY, 'projects', projectId, docType] as const
}

export function getManyDocsQueryKey<D extends WriteableDocType>({
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

export function getDocByDocIdQueryKey<D extends WriteableDocType>({
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

export function getDocByVersionIdQueryKey<D extends WriteableDocType>({
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

export function docsQueryOptions<D extends WriteableDocType>({
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
		queryKey: getManyDocsQueryKey({
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

export function docByDocIdQueryOptions<D extends WriteableDocType>({
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
		queryKey: getDocByDocIdQueryKey({
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

export function docByVersionIdQueryOptions<D extends WriteableDocType>({
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
		queryKey: getDocByVersionIdQueryKey({
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

export function createDocMutationOptions<
	D extends WriteableDocType,
	Result = WriteableDoc<D> & DerivedDocFields,
>({
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
		mutationFn: async ({ value }): Promise<Result> => {
			// @ts-expect-error TS not handling this well
			return projectApi[docType].create({
				...value,
				schemaName: docType,
			})
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: getDocsQueryKey({
					projectId,
					docType,
				}),
			})
		},
	} satisfies UseMutationOptions<
		Result,
		Error,
		{ value: Omit<WriteableValue<D>, 'schemaName'> }
	>
}

export function updateDocMutationOptions<
	D extends WriteableDocType,
	Result = WriteableDoc<D> & DerivedDocFields,
>({
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
		mutationFn: async ({ versionId, value }): Promise<Result> => {
			// @ts-expect-error TS not handling this well
			return projectApi[docType].update(versionId, value)
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: getDocsQueryKey({
					projectId,
					docType,
				}),
			})
		},
	} satisfies UseMutationOptions<
		Result,
		Error,
		{ versionId: string; value: Omit<WriteableValue<D>, 'schemaName'> }
	>
}

export function deleteDocMutationOptions<
	D extends WriteableDocType,
	Result = WriteableDoc<D> & DerivedDocFields,
>({
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
		mutationFn: async ({ docId }): Promise<Result> => {
			// @ts-expect-error TS not handling this well
			return projectApi[docType].delete(docId)
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: getDocsQueryKey({
					projectId,
					docType,
				}),
			})
		},
	} satisfies UseMutationOptions<Result, Error, { docId: string }>
}

import type { MapeoProjectApi } from '@comapeo/ipc' with { 'resolution-mode': 'import' }
import type { MapeoDoc } from '@comapeo/schema' with { 'resolution-mode': 'import' }
import { queryOptions } from '@tanstack/react-query'

import { baseQueryOptions, ROOT_QUERY_KEY } from './shared.js'

export type DocumentType = Extract<
	MapeoDoc['schemaName'],
	'field' | 'observation' | 'preset' | 'track' | 'remoteDetectionAlert'
>

export function getDocumentsQueryKey<D extends DocumentType>({
	projectId,
	docType,
}: {
	projectId: string
	docType: D
}) {
	return [ROOT_QUERY_KEY, 'projects', projectId, docType] as const
}

export function getManyDocumentsQueryKey<D extends DocumentType>({
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

export function getDocumentByDocIdQueryKey<D extends DocumentType>({
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

export function getDocumentByVersionIdQueryKey<D extends DocumentType>({
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

export function documentsQueryOptions<D extends DocumentType>({
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

export function documentByDocumentIdQueryOptions<D extends DocumentType>({
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

export function documentByVersionIdQueryOptions<D extends DocumentType>({
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

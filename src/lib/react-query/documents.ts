import type { MapeoProjectApi } from '@comapeo/ipc'
import type { MapeoDoc } from '@comapeo/schema'
import { queryOptions } from '@tanstack/react-query'

import { baseQueryOptions, ROOT_QUERY_KEY } from './shared'

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
	opts,
}: {
	projectId: string
	docType: D
	opts?: Parameters<MapeoProjectApi[D]['getMany']>[0]
}) {
	return [ROOT_QUERY_KEY, 'projects', projectId, docType, opts] as const
}

export function getDocumentByDocIdQueryKey<D extends DocumentType>({
	projectId,
	docType,
	docId,
	opts,
}: {
	projectId: string
	docType: D
	docId: Parameters<MapeoProjectApi[D]['getByDocId']>[0]
	opts?: Parameters<MapeoProjectApi[D]['getByDocId']>[1]
}) {
	return [ROOT_QUERY_KEY, 'projects', projectId, docType, docId, opts] as const
}

export function getDocumentByVersionIdQueryKey<D extends DocumentType>({
	projectId,
	docType,
	versionId,
	opts,
}: {
	projectId: string
	docType: D
	versionId: Parameters<MapeoProjectApi[D]['getByVersionId']>[0]
	opts?: Parameters<MapeoProjectApi[D]['getByVersionId']>[1]
}) {
	return [
		ROOT_QUERY_KEY,
		'projects',
		projectId,
		docType,
		versionId,
		opts,
	] as const
}

export function documentsQueryOptions<D extends DocumentType>({
	projectApi,
	projectId,
	docType,
	opts,
}: {
	projectApi: MapeoProjectApi
	projectId: string
	docType: D
	opts?: Parameters<MapeoProjectApi[D]['getMany']>[0]
}) {
	return queryOptions({
		...baseQueryOptions(),
		queryKey: getManyDocumentsQueryKey({ projectId, docType, opts }),
		queryFn: async () => {
			return projectApi[docType].getMany(opts)
		},
	})
}

export function documentByDocumentIdQueryOptions<D extends DocumentType>({
	projectApi,
	projectId,
	docType,
	docId,
	opts,
}: {
	projectApi: MapeoProjectApi
	projectId: string
	docType: D
	docId: Parameters<MapeoProjectApi[D]['getByDocId']>[0]
	opts?: Parameters<MapeoProjectApi[D]['getByDocId']>[1]
}) {
	return queryOptions({
		...baseQueryOptions(),
		queryKey: getDocumentByDocIdQueryKey({
			projectId,
			docType,
			docId,
			opts,
		}),
		queryFn: async () => {
			return projectApi[docType].getByDocId(docId, opts)
		},
	})
}

export function documentByVersionIdQueryOptions<D extends DocumentType>({
	projectApi,
	projectId,
	docType,
	versionId,
	opts,
}: {
	projectApi: MapeoProjectApi
	projectId: string
	docType: D
	versionId: Parameters<MapeoProjectApi[D]['getByVersionId']>[0]
	opts?: Parameters<MapeoProjectApi[D]['getByVersionId']>[1]
}) {
	return queryOptions({
		...baseQueryOptions(),
		queryKey: getDocumentByVersionIdQueryKey({
			projectId,
			docType,
			versionId,
			opts,
		}),
		queryFn: async () => {
			return projectApi[docType].getByVersionId(versionId, opts)
		},
	})
}

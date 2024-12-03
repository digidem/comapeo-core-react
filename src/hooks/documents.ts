import { useSuspenseQuery } from '@tanstack/react-query'

import {
	documentByDocumentIdQueryOptions,
	documentByVersionIdQueryOptions,
	documentsQueryOptions,
	type DocumentType,
} from '../lib/react-query/documents'
import { useSingleProject } from './projects'

// TODO: Return type is not narrowed properly by `docType`
export function useSingleDocByDocId<D extends DocumentType>({
	projectId,
	docType,
	docId,
	opts,
}: {
	projectId: string
	docType: D
	docId: string
	opts?: Parameters<typeof documentByDocumentIdQueryOptions>[0]['opts']
}) {
	const { data: projectApi } = useSingleProject({ projectId })

	const { data, isRefetching } = useSuspenseQuery(
		documentByDocumentIdQueryOptions({
			projectApi,
			projectId,
			docType,
			docId,
			opts,
		}),
	)

	return { data, isRefetching }
}

// TODO: Return type is not narrowed properly by `docType`
export function useSingleDocByVersionId<D extends DocumentType>({
	projectId,
	docType,
	versionId,
	opts,
}: {
	projectId: string
	docType: D
	versionId: string
	opts?: Parameters<typeof documentByVersionIdQueryOptions>[0]['opts']
}) {
	const { data: projectApi } = useSingleProject({ projectId })

	const { data, isRefetching } = useSuspenseQuery(
		documentByVersionIdQueryOptions({
			projectApi,
			projectId,
			docType,
			versionId,
			opts,
		}),
	)

	return { data, isRefetching }
}

// TODO: Return type is not narrowed properly by `docType`
export function useManyDocs<D extends DocumentType>({
	projectId,
	docType,
	opts,
}: {
	projectId: string
	docType: D
	opts?: Parameters<typeof documentsQueryOptions>[0]['opts']
}) {
	const { data: projectApi } = useSingleProject({ projectId })

	const { data, isRefetching } = useSuspenseQuery(
		documentsQueryOptions({
			projectApi,
			projectId,
			docType,
			opts,
		}),
	)

	return { data, isRefetching }
}

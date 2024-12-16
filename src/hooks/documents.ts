import { useSuspenseQuery } from '@tanstack/react-query'

import {
	documentByDocumentIdQueryOptions,
	documentByVersionIdQueryOptions,
	documentsQueryOptions,
	type DocumentType,
} from '../lib/react-query/documents'
import { useSingleProject } from './projects'

// TODO: Return type is not narrowed properly by `docType`
/**
 * Retrieve a single document from the database based on the document's document ID.
 *
 * Triggers the closest error boundary if the document cannot be found
 *
 * @param {Object} opts
 * @param {string} opts.projectId Project public ID
 * @param {DocumentType} opts.docType Document type of interest
 * @param {string} opts.docId Document ID
 * @param {string} [opts.lang] Language to translate the document into
 *
 * @example
 * ```tsx
 * function SingleDocumentByDocIdExample() {
 *   const { data } = useSingleDocByDocId({
 *     projectId: '...',
 *     docType: 'observation',
 *     docId: '...',
 *   })
 *
 *   console.log(data.schemaName) // logs 'observation'
 * }
 * ```
 */
export function useSingleDocByDocId<D extends DocumentType>({
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
	const { data: projectApi } = useSingleProject({ projectId })

	const { data, error, isRefetching } = useSuspenseQuery(
		documentByDocumentIdQueryOptions({
			projectApi,
			projectId,
			docType,
			docId,
			lang,
		}),
	)

	return { data, error, isRefetching }
}

// TODO: Return type is not narrowed properly by `docType`
/**
 * Retrieve a single document from the database based on the document's version ID.
 *
 * Triggers the closest error boundary if the document cannot be found.
 *
 * @param {Object} opts
 * @param {string} opts.projectId Project public ID
 * @param {DocumentType} opts.docType Document type of interest
 * @param {string} opts.versionId Document's version ID
 * @param {string} [opts.lang] Language to translate the document into
 *
 *  * @example
 * ```tsx
 * function SingleDocumentByVersionIdExample() {
 *   const { data } = useSingleDocByVersionId({
 *     projectId: '...',
 *     docType: 'observation',
 *     docId: '...',
 *   })
 *
 *   console.log(data.schemaName) // logs 'observation'
 * }
 * ```
 */
export function useSingleDocByVersionId<D extends DocumentType>({
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
	const { data: projectApi } = useSingleProject({ projectId })

	const { data, error, isRefetching } = useSuspenseQuery(
		documentByVersionIdQueryOptions({
			projectApi,
			projectId,
			docType,
			versionId,
			lang,
		}),
	)

	return { data, error, isRefetching }
}

// TODO: Return type is not narrowed properly by `docType`
/**
 * Retrieve all documents of a specific `docType`.
 *
 * @param {Object} opts
 * @param opts.projectId Project public ID
 * @param opts.docType Document type of interest
 * @param opts.includeDeleted Include documents that have been marked as deleted
 * @param opts.lang Language to translate the documents into
 *
 * @example
 * ```tsx
 * function BasicExample() {
 *   const { data } = useManyDocs({
 *     projectId: '...',
 *     docType: 'observations',
 *   })
 * }
 * ```
 *
 * ```tsx
 * function useAllObservations(opts) {
 *   return useManyDocs({
 *     ...opts,
 *     docType: 'observations',
 *   })
 * }
 *
 * function useAllPresets(opts) {
 *   return useManyDocs({
 *     ...opts,
 *     docType: 'presets',
 *   })
 * }
 * ```
 */
export function useManyDocs<D extends DocumentType>({
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
	const { data: projectApi } = useSingleProject({ projectId })

	const { data, error, isRefetching } = useSuspenseQuery(
		documentsQueryOptions({
			projectApi,
			projectId,
			docType,
			includeDeleted,
			lang,
		}),
	)

	return { data, error, isRefetching }
}

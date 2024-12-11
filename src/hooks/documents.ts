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
 * @param {Object} [opts.opts]
 * @param {string} [opts.opts.lang] Language to translate the document into
 *
 * @example
 * ```tsx
 * function SingleDocumentByDocIdExample() {
 *   const { data, isRefetching } = useSingleDocByDocId({
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
/**
 * Retrieve a single document from the database based on the document's version ID.
 *
 * Triggers the closest error boundary if the document cannot be found.
 *
 * @param {Object} opts
 * @param {string} opts.projectId Project public ID
 * @param {DocumentType} opts.docType Document type of interest
 * @param {string} opts.versionId Document's version ID
 * @param {Object} [opts.opts]
 * @param {string} [opts.opts.lang] Language to translate the document into
 *
 *  * @example
 * ```tsx
 * function SingleDocumentByVersionIdExample() {
 *   const { data, isRefetching } = useSingleDocByVersionId({
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
/**
 * Retrieve all documents of a specific `docType`.
 *
 * @param {Object} opts
 * @param {string} opts.projectId Project public ID
 * @param {DocumentType} opts.docType Document type of interest
 * @param {Object} [opts.opts]
 * @param {boolean} [opts.opts.includeDeleted] Include documents that have been marked as deleted
 * @param {string} [opts.opts.lang] Language to translate the documents into
 *
 * @example
 * ```tsx
 * function BasicExample() {
 *   const { data, isRefetching } = useManyDocs({
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

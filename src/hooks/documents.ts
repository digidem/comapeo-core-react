import type { Preset } from '@comapeo/schema' with {
	'resolution-mode': 'import',
}
import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from '@tanstack/react-query'
import { useMemo } from 'react'

import { getPresetsSelection } from '../lib/presets.js'
import {
	createDocumentMutationOptions,
	deleteDocumentMutationOptions,
	documentByDocumentIdQueryOptions,
	documentByVersionIdQueryOptions,
	documentsQueryOptions,
	updateDocumentMutationOptions,
} from '../lib/react-query/documents.js'
import type { WriteableDocumentType } from '../lib/types.js'
import { useProjectSettings, useSingleProject } from './projects.js'

/**
 * Retrieve a single document from the database based on the document's document ID.
 *
 * Triggers the closest error boundary if the document cannot be found
 *
 * @param opts.projectId Project public ID
 * @param opts.docType Document type of interest
 * @param opts.docId Document ID
 * @param opts.lang Language to translate the document into
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
export function useSingleDocByDocId<D extends WriteableDocumentType>({
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

	return {
		data: data as Extract<typeof data, { schemaName: D }>,
		error,
		isRefetching,
	}
}

/**
 * Retrieve a single document from the database based on the document's version ID.
 *
 * Triggers the closest error boundary if the document cannot be found.
 *
 * @param opts.projectId Project public ID
 * @param opts.docType Document type of interest
 * @param opts.versionId Document's version ID
 * @param opts.lang Language to translate the document into
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
export function useSingleDocByVersionId<D extends WriteableDocumentType>({
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

	return {
		data: data as Extract<typeof data, { schemaName: D }>,
		error,
		isRefetching,
	}
}

/**
 * Retrieve all documents of a specific `docType`.
 *
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
export function useManyDocs<D extends WriteableDocumentType>({
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

	return {
		data: data as Extract<typeof data, Array<{ schemaName: D }>>,
		error,
		isRefetching,
	}
}

/**
 * Create a document for a project.
 *
 * @param opts.docType Document type to create.
 * @param opts.projectId Public ID of project to create document for.
 */
export function useCreateDocument<D extends WriteableDocumentType>({
	docType,
	projectId,
}: {
	docType: D
	projectId: string
}) {
	const queryClient = useQueryClient()
	const { data: projectApi } = useSingleProject({ projectId })

	const { error, mutate, mutateAsync, reset, status } = useMutation(
		createDocumentMutationOptions({
			docType,
			projectApi,
			projectId,
			queryClient,
		}),
	)

	return status === 'error'
		? { error, mutate, mutateAsync, reset, status }
		: { error: null, mutate, mutateAsync, reset, status }
}

/**
 * Update a document within a project.
 *
 * @param opts.docType Document type to update.
 * @param opts.projectId Public ID of project document belongs to.
 */
export function useUpdateDocument<D extends WriteableDocumentType>({
	docType,
	projectId,
}: {
	docType: D
	projectId: string
}) {
	const queryClient = useQueryClient()
	const { data: projectApi } = useSingleProject({ projectId })

	const { error, mutate, mutateAsync, reset, status } = useMutation(
		updateDocumentMutationOptions({
			docType,
			projectApi,
			projectId,
			queryClient,
		}),
	)

	return status === 'error'
		? { error, mutate, mutateAsync, reset, status }
		: { error: null, mutate, mutateAsync, reset, status }
}

/**
 * Delete a document within a project.
 *
 * @param opts.docType Document type to delete.
 * @param opts.projectId Public ID of project document belongs to.
 */
export function useDeleteDocument<D extends WriteableDocumentType>({
	docType,
	projectId,
}: {
	docType: D
	projectId: string
}) {
	const queryClient = useQueryClient()
	const { data: projectApi } = useSingleProject({ projectId })

	const { error, mutate, mutateAsync, reset, status } = useMutation(
		deleteDocumentMutationOptions({
			docType,
			projectApi,
			projectId,
			queryClient,
		}),
	)

	return status === 'error'
		? { error, mutate, mutateAsync, reset, status }
		: { error: null, mutate, mutateAsync, reset, status }
}
const dataTypeToGeometry = {
	observation: 'point',
	track: 'line',
} as const

/**
 * Retrieve presets for category selection, ordered by project settings.
 *
 * Returns presets in the order defined by `projectSettings.defaultPresets` for the
 * specified data type. Falls back to alphabetical order (by preset name) if no defaults are configured.
 *
 * @param opts.projectId Project public ID
 * @param opts.dataType Type of data being created ('observation' or 'track')
 * @param opts.lang Language to translate presets into
 *
 * @example
 * ```tsx
 * function ObservationCategoryChooser() {
 *   const presets = usePresetsSelection({
 *     projectId: '...',
 *     dataType: 'observation',
 *   })
 * }
 * ```
 *
 * ```tsx
 * function TrackCategoryChooser() {
 *   const presets = usePresetsSelection({
 *     projectId: '...',
 *     dataType: 'track',
 *   })
 * }
 * ```
 */
export function usePresetsSelection({
	projectId,
	dataType,
	lang,
}: {
	projectId: string
	dataType: 'observation' | 'track'
	lang?: string
}): Array<Preset> {
	const { data: projectSettings } = useProjectSettings({ projectId })
	const { data: presets } = useManyDocs({
		projectId,
		docType: 'preset',
		lang,
	})

	const presetsSelection = useMemo(() => {
		const geometry = dataTypeToGeometry[dataType]
		const defaults = projectSettings.defaultPresets?.[geometry]
		return getPresetsSelection(presets, defaults)
	}, [presets, projectSettings.defaultPresets, dataType])

	return presetsSelection
}

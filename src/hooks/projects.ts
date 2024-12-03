import type { BlobId } from '@comapeo/core/dist/types'
import { useSuspenseQuery } from '@tanstack/react-query'

import {
	attachmentUrlQueryOptions,
	documentCreatedByQueryOptions,
	iconUrlQueryOptions,
	projectByIdQueryOptions,
	projectMemberByIdQueryOptions,
	projectMembersQueryOptions,
	projectSettingsQueryOptions,
	projectsQueryOptions,
} from '../lib/react-query/projects'
import { useClientApi } from './client'

export function useProjectSettings({ projectId }: { projectId: string }) {
	const clientApi = useClientApi()

	const { data: projectApi } = useSuspenseQuery(
		projectByIdQueryOptions({
			projectId,
			clientApi,
		}),
	)

	const { data, isRefetching } = useSuspenseQuery(
		projectSettingsQueryOptions({
			projectApi,
			projectId,
		}),
	)

	return { data, isRefetching }
}

export function useSingleProject({ projectId }: { projectId: string }) {
	const clientApi = useClientApi()

	const { data, isRefetching } = useSuspenseQuery(
		projectByIdQueryOptions({
			clientApi,
			projectId,
		}),
	)

	return { data, isRefetching }
}

export function useManyProjects() {
	const clientApi = useClientApi()

	const { data, isRefetching } = useSuspenseQuery(
		projectsQueryOptions({
			clientApi,
		}),
	)

	return { data, isRefetching }
}

export function useSingleMember({
	projectId,
	deviceId,
}: {
	projectId: string
	deviceId: string
}) {
	const { data: projectApi } = useSingleProject({ projectId })

	const { data, isRefetching } = useSuspenseQuery(
		projectMemberByIdQueryOptions({
			projectApi,
			projectId,
			deviceId,
		}),
	)

	return { data, isRefetching }
}

export function useManyMembers({ projectId }: { projectId: string }) {
	const { data: projectApi } = useSingleProject({ projectId })

	const { data, isRefetching } = useSuspenseQuery(
		projectMembersQueryOptions({ projectApi, projectId }),
	)

	return { data, isRefetching }
}

export function useIconUrl({
	projectId,
	iconId,
	opts,
}: {
	projectId: string
	iconId: string
	opts: Parameters<typeof iconUrlQueryOptions>[0]['opts']
}) {
	const { data: projectApi } = useSingleProject({ projectId })

	const { data, isRefetching } = useSuspenseQuery(
		iconUrlQueryOptions({
			projectApi,
			projectId,
			iconId,
			opts,
		}),
	)

	return { data, isRefetching }
}

export function useAttachmentUrl<B extends BlobId>({
	projectId,
	blobId,
}: {
	projectId: string
	blobId: B
}) {
	const { data: projectApi } = useSingleProject({ projectId })

	const { data, isRefetching } = useSuspenseQuery(
		attachmentUrlQueryOptions({
			projectApi,
			projectId,
			blobId,
		}),
	)

	return { data, isRefetching }
}

// TODO: Eventually remove in favor of this information being provided by the backend when retrieving documents
export function useDocumentCreatedBy({
	projectId,
	originalVersionId,
}: {
	projectId: string
	originalVersionId: string
}) {
	const { data: projectApi } = useSingleProject({ projectId })

	const { data, isRefetching } = useSuspenseQuery(
		documentCreatedByQueryOptions({ projectApi, projectId, originalVersionId }),
	)

	return { data, isRefetching }
}

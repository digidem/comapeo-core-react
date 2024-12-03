import {
	useIconUrl,
	useManyMembers,
	useManyProjects,
	useSingleProject,
	useProjectSettings,
	useSingleMember,
	useAttachmentUrl,
	useDocumentCreatedBy,
} from '../../src/hooks/projects'

const manyMembersQuery = useManyMembers({
	projectId: 'project_1',
})

const manyProjectsQuery = useManyProjects()

const projectByIdQuery = useSingleProject({
	projectId: 'project_1',
})

const projectSettingsQuery = useProjectSettings({ projectId: 'project_1' })

const singleMemberQuery = useSingleMember({
	projectId: 'project_1',
	deviceId: 'device_1',
})

const iconUrlQuery = useIconUrl({
	projectId: 'project_1',
	iconId: 'icon_1',
	opts: { mimeType: 'image/png', pixelDensity: 1, size: 'medium' },
})

const attachmentUrlQuery = useAttachmentUrl({
	projectId: 'project_1',
	blobId: {
		driveId: 'drive_1',
		name: 'name_1',
		type: 'photo',
		variant: 'original',
	},
})

const documentCreatedByQuery = useDocumentCreatedBy({
	projectId: 'project_1',
	originalVersionId: 'version_1',
})

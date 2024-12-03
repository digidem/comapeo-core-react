import {
	useManyDocs,
	useSingleDocByDocId,
	useSingleDocByVersionId,
} from '../../src/hooks/documents'

function observationTest() {
	const docType = 'observation'

	const observationByDocIdQuery = useSingleDocByDocId({
		projectId: 'project_1',
		docId: 'doc_1',
		docType,
	})

	const observationByVersionIdQuery = useSingleDocByVersionId({
		projectId: 'project_1',
		docType,
		versionId: 'version_1',
	})

	const allObservationsQuery = useManyDocs({
		projectId: 'project_1',
		docType,
	})
}

function presetTest() {
	const docType = 'preset'

	const presetByDocIdQuery = useSingleDocByDocId({
		projectId: 'project_1',
		docId: 'doc_1',
		docType,
	})

	const presetByVersionIdQuery = useSingleDocByVersionId({
		projectId: 'project_1',
		docType,
		versionId: 'version_1',
	})

	const allPresetsQuery = useManyDocs({
		projectId: 'project_1',
		docType,
	})
}

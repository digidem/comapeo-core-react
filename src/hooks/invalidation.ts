import { useQueryClient } from '@tanstack/react-query'

import {
	getClientQueryKey,
	getDeviceInfoQueryKey,
	getIsArchiveDeviceQueryKey,
} from '../lib/react-query/client.js'
import {
	getDocumentByDocIdQueryKey,
	getDocumentByVersionIdQueryKey,
	getDocumentsQueryKey,
	getManyDocumentsQueryKey,
} from '../lib/react-query/documents.js'
import {
	getInvitesQueryKey,
	getPendingInvitesQueryKey,
} from '../lib/react-query/invites.js'
import {
	getMapsQueryKey,
	getStyleJsonUrlQueryKey,
} from '../lib/react-query/maps.js'
import {
	getAttachmentUrlQueryKey,
	getDocumentCreatedByQueryKey,
	getIconUrlQueryKey,
	getMemberByIdQueryKey,
	getMembersQueryKey,
	getProjectByIdQueryKey,
	getProjectRoleQueryKey,
	getProjectSettingsQueryKey,
	getProjectsQueryKey,
} from '../lib/react-query/projects.js'
import { ROOT_QUERY_KEY } from '../lib/react-query/shared.js'

export const PATH_TO_QUERY_KEY_FACTORY = {
	'/': () => [ROOT_QUERY_KEY] as const,
	'/maps': getMapsQueryKey,
	'/maps/styleJsonUrl': getStyleJsonUrlQueryKey,
	'/invites': getInvitesQueryKey,
	'/invites/pending': getPendingInvitesQueryKey,
	'/client': getClientQueryKey,
	'/client/deviceInfo': getDeviceInfoQueryKey,
	'/client/isArchiveDevice': getIsArchiveDeviceQueryKey,
	'/projects': getProjectsQueryKey,
	'/projects/:projectId': getProjectByIdQueryKey,
	'/projects/:projectId/settings': getProjectSettingsQueryKey,
	'/projects/:projectId/role': getProjectRoleQueryKey,
	'/projects/:projectId/members': getMembersQueryKey,
	'/projects/:projectId/members/:deviceId': getMemberByIdQueryKey,
	'/projects/:projectId/icons/:iconId': getIconUrlQueryKey,
	'/projects/:projectId/documentCreatedBy/:originalVersionId':
		getDocumentCreatedByQueryKey,
	'/projects/:projectId/attachments/:blobId': getAttachmentUrlQueryKey,
	'/projects/:projectId/:docType': (
		opts: Parameters<
			typeof getDocumentsQueryKey | typeof getManyDocumentsQueryKey
		>[0],
	) => {
		if ('lang' in opts || 'includeDeleted' in opts) {
			return getManyDocumentsQueryKey(opts)
		}
		return getDocumentsQueryKey(opts)
	},
	'/projects/:projectId/:docType/:docId': getDocumentByDocIdQueryKey,
	'/projects/:projectId/:docType/:versionId': getDocumentByVersionIdQueryKey,
} as const

/**
 * Provides a function that invalidates a specified read when called.
 *
 * @example
 * ```tsx
 * function App() {
 *   const invalidateRead = useInvalidateRead()
 *
 *   return (
 *     <button
 *       onClick={() => {
 *         // Invalidate all reads!
 *         invalidateRead('/', undefined)
 *       }}
 *     >
 *       Invalidate everything!
 *     </button>
 *   )
 * }
 * ```
 */
export function useInvalidateRead(): <
	Path extends keyof typeof PATH_TO_QUERY_KEY_FACTORY,
>(
	path: Path,
	params: Parameters<(typeof PATH_TO_QUERY_KEY_FACTORY)[Path]>[0],
	invalidationOpts?: {
		exact: boolean
	},
) => Promise<void> {
	const queryClient = useQueryClient()

	return (path, pathParams, invalidationOpts) => {
		return queryClient.invalidateQueries({
			exact: invalidationOpts?.exact,
			queryKey: PATH_TO_QUERY_KEY_FACTORY[path](
				// @ts-expect-error TS not capable enough to get this right
				pathParams,
			),
		})
	}
}

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import { assert, test, vi } from 'vitest'

import { PATH_TO_QUERY_KEY_FACTORY } from '../../src/hooks/invalidation.js'
import { useInvalidateRead } from '../../src/index.js'

test('useInvalidateRead()', async () => {
	const queryClient = new QueryClient()

	const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

	const invalidateReadHook = renderHook(() => useInvalidateRead(), {
		wrapper: ({ children }) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		),
	})

	const fixtures = [
		['/', undefined],
		['/maps', undefined],
		['/maps/styleJsonUrl', undefined],
		['/invites', undefined],
		['/invites/pending', undefined],
		['/client', undefined],
		['/client/deviceInfo', undefined],
		['/client/isArchiveDevice', undefined],
		['/projects', undefined],
		['/projects/:projectId', { projectId: 'abc123' }],
		['/projects/:projectId/settings', { projectId: 'project_1' }],
		['/projects/:projectId/role', { projectId: 'project_1' }],
		['/projects/:projectId/members', { projectId: 'project_1' }],
		[
			'/projects/:projectId/members/:deviceId',
			{ projectId: 'project_1', deviceId: 'device_a' },
		],
		[
			'/projects/:projectId/icons/:iconId',
			{ projectId: 'project_1', iconId: 'icon_a' },
		],
		[
			'/projects/:projectId/documentCreatedBy/:originalVersionId',
			{ projectId: 'project_1', originalVersionId: 'version_a' },
		],
		[
			'/projects/:projectId/attachments/:blobId',
			{ projectId: 'project_1', blobId: {} },
		],
		[
			'/projects/:projectId/:docType',
			{ projectId: 'project_1', docType: 'observation' },
		],
		[
			'/projects/:projectId/:docType/:docId',
			{ projectId: 'project_1', docType: 'observation', docId: 'doc_a' },
		],
		[
			'/projects/:projectId/:docType/:versionId',
			{ projectId: 'project_1', docType: 'observation', docId: 'version_a' },
		],
	] as const

	assert.sameMembers(
		fixtures.map((v) => {
			return v[0]
		}),
		Object.keys(PATH_TO_QUERY_KEY_FACTORY),
		'all possible paths are being tested',
	)

	for (const args of fixtures) {
		// Without invalidation opts
		{
			await invalidateReadHook.result.current(args[0], args[1])
			const calledWith = invalidateQueriesSpy.mock.lastCall?.[0]

			assert(calledWith)
			assert(calledWith.exact === undefined)
			assert.isArray(calledWith.queryKey)
			assert.isNotEmpty(calledWith.queryKey)
		}

		// With invalidation opts
		{
			const invalidationOpts = { exact: true }
			await invalidateReadHook.result.current(
				args[0],
				args[1],
				invalidationOpts,
			)
			const calledWith = invalidateQueriesSpy.mock.lastCall?.[0]
			assert(calledWith)
			assert(calledWith.exact === true)
			assert.isArray(calledWith.queryKey)
			assert.isNotEmpty(calledWith.queryKey)
		}
	}
})

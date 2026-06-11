import { QueryClient } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { JSXElementConstructor, ReactNode } from 'react'
import { assert, describe, test } from 'vitest'

import {
	useDataSyncProgress,
	useStartSync,
	useStopSync,
} from '../../src/hooks/projects.js'
import {
	useCreateProject,
	useLeaveProject,
	useManyMembers,
	useManyProjects,
	useSingleProject,
	useSyncState,
} from '../../src/index.js'
import {
	getMembersQueryKey,
	getProjectsQueryKey,
} from '../../src/lib/react-query.js'
import { setupCoreIpc } from '../helpers/ipc.js'
import { createWrapper } from '../helpers/react.js'

describe('sync', () => {
	async function initializeProject({
		name,
		wrapper,
	}: {
		name: string
		wrapper?: JSXElementConstructor<{ children: ReactNode }>
	}): Promise<string> {
		const createProjectHook = renderHook(() => useCreateProject(), { wrapper })

		let projectId: string | undefined

		const createProjectPromise = new Promise<void>((res, rej) => {
			createProjectHook.result.current.mutate(
				{ name },
				{
					onError: rej,
					onSuccess: (result) => {
						projectId = result
						res()
					},
				},
			)
		})

		await waitFor(() => {
			return createProjectPromise
		})

		assert(projectId)

		const project1 = renderHook(
			({ projectId }) => useSingleProject({ projectId }),
			{ wrapper, initialProps: { projectId } },
		)

		await waitFor(() => {
			return project1.result.current !== null
		})

		return projectId
	}

	test('sync state (no peers)', async (t) => {
		const { client, cleanup } = setupCoreIpc()

		t.onTestFinished(() => {
			return cleanup()
		})

		const queryClient = new QueryClient()

		const wrapper = createWrapper({ clientApi: client, queryClient })

		const project1Id = await initializeProject({ name: 'project_1', wrapper })

		// ---------- Actual tests ----------

		const syncStateHook = renderHook(
			({ projectId }) => useSyncState({ projectId }),
			{ wrapper, initialProps: { projectId: project1Id } },
		)

		// 1. Initial hook value
		assert(
			syncStateHook.result.current === null,
			'initial sync state hook value',
		)

		await waitFor(() => {
			return syncStateHook.result.current !== null
		})

		// 2. After sync state is initially calculated when project sync has not been enabled
		assert.deepStrictEqual(
			syncStateHook.result.current,
			{
				data: { isSyncEnabled: false },
				initial: { isSyncEnabled: true },
				remoteDeviceSyncState: {},
			},
			'sync state when initialized',
		)

		// 3. After project enables sync
		const startSyncHook = renderHook(
			({ projectId }) => useStartSync({ projectId }),
			{ wrapper, initialProps: { projectId: project1Id } },
		)

		act(() => {
			startSyncHook.result.current.mutate(undefined)
		})

		// TODO: Ideally wait for pending status first
		await waitFor(() => {
			assert(startSyncHook.result.current.status === 'success')
		})

		assert.deepStrictEqual(
			syncStateHook.result.current,
			{
				data: { isSyncEnabled: true },
				initial: { isSyncEnabled: true },
				remoteDeviceSyncState: {},
			},
			'sync state after sync is enabled',
		)

		// 3. After project disables sync
		const stopSyncHook = renderHook(
			({ projectId }) => useStopSync({ projectId }),
			{ wrapper, initialProps: { projectId: project1Id } },
		)

		act(() => {
			stopSyncHook.result.current.mutate(undefined)
		})

		// TODO: Ideally wait for pending status first
		await waitFor(() => {
			assert(stopSyncHook.result.current.status === 'success')
		})

		assert.deepStrictEqual(
			syncStateHook.result.current,
			{
				data: { isSyncEnabled: false },
				initial: { isSyncEnabled: true },
				remoteDeviceSyncState: {},
			},
			'sync state after sync is disabled',
		)
	})

	test('data sync progress (no peers)', async (t) => {
		const { client, cleanup } = setupCoreIpc()

		t.onTestFinished(() => {
			return cleanup()
		})

		const queryClient = new QueryClient()

		const wrapper = createWrapper({ clientApi: client, queryClient })

		const project1Id = await initializeProject({ name: 'project_1', wrapper })

		// ---------- Actual tests ----------

		// 1. Initial hook value
		const dataSyncProgressHook = renderHook(
			({ projectId }) => useDataSyncProgress({ projectId }),
			{ wrapper, initialProps: { projectId: project1Id } },
		)

		assert(
			dataSyncProgressHook.result.current === null,
			'initial hook value is null',
		)

		// 2. TODO: After project enables sync

		// 3. TODO: After disables sync
	})
})

describe('useLeaveProject()', () => {
	// Regression test: leaving a project closes its non-auth data stores, so
	// refetching the left project's queries errors with 'Cannot await idle
	// after closing'. Queries for the left project must not be refetched.
	test('does not refetch queries for the left project', async (t) => {
		const { client, cleanup } = setupCoreIpc()

		t.onTestFinished(() => {
			return cleanup()
		})

		const queryClient = new QueryClient()

		const wrapper = createWrapper({ clientApi: client, queryClient })

		const projectId = await client.createProject({ name: 'project_1' })
		const otherProjectId = await client.createProject({ name: 'project_2' })

		// Simulates a screen that stays mounted during the leave flow
		// (e.g. a project members list)
		const membersHook = renderHook(
			() => useManyMembers({ projectId, includeLeft: true }),
			{ wrapper },
		)

		// A query for a different project, which should still be refetched
		const otherMembersHook = renderHook(
			() => useManyMembers({ projectId: otherProjectId, includeLeft: true }),
			{ wrapper },
		)

		await waitFor(() => {
			assert.isNotNull(membersHook.result.current.data)
			assert.isNotNull(otherMembersHook.result.current.data)
		})

		const otherMembersUpdatedAt = queryClient.getQueryState(
			getMembersQueryKey({ projectId: otherProjectId, includeLeft: true }),
		)?.dataUpdatedAt

		assert(otherMembersUpdatedAt)

		const projectsListHook = renderHook(() => useManyProjects(), { wrapper })

		await waitFor(() => {
			assert.isNotNull(projectsListHook.result.current.data)
		})

		const projectsListUpdatedAt = queryClient.getQueryState(
			getProjectsQueryKey(),
		)?.dataUpdatedAt

		assert(projectsListUpdatedAt)

		const leaveHook = renderHook(() => useLeaveProject(), { wrapper })

		act(() => {
			leaveHook.result.current.mutate({ projectId })
		})

		await waitFor(() => {
			assert.strictEqual(leaveHook.result.current.status, 'success')
		})

		// Wait for invalidation-triggered refetches to settle
		await waitFor(() => {
			assert.strictEqual(queryClient.isFetching(), 0)
		})

		assert.isNull(
			membersHook.result.current.error,
			'members query for the left project was not refetched',
		)

		// The left project's queries should be marked stale, so that they are
		// refetched if ever observed again (e.g. after re-joining the project)
		assert.isTrue(
			queryClient.getQueryState(
				getMembersQueryKey({ projectId, includeLeft: true }),
			)?.isInvalidated,
			'members query for the left project is marked stale',
		)

		// The projects list itself should still be refreshed
		await waitFor(() => {
			const updatedAt = queryClient.getQueryState(
				getProjectsQueryKey(),
			)?.dataUpdatedAt
			assert(updatedAt)
			assert.isAbove(updatedAt, projectsListUpdatedAt)
		})

		// Queries for other projects should still be refetched
		await waitFor(() => {
			const updatedAt = queryClient.getQueryState(
				getMembersQueryKey({ projectId: otherProjectId, includeLeft: true }),
			)?.dataUpdatedAt
			assert(updatedAt)
			assert.isAbove(updatedAt, otherMembersUpdatedAt)
		})
	})
})

import { QueryClient } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { JSXElementConstructor, ReactNode } from 'react'
import { assert, describe, expect, test } from 'vitest'

import {
	useCloseProject,
	useDataSyncProgress,
	useOwnRoleInProject,
	useStartSync,
	useStopSync,
} from '../../src/hooks/projects.js'
import {
	useCreateProject,
	useManyDocs,
	useSingleProject,
	useSyncState,
	type WriteableDocumentType,
} from '../../src/index.js'
import { setupCoreIpc } from '../helpers/ipc.js'
import { createClientApiWrapper } from '../helpers/react.js'

describe('close', () => {
	test('makes project instance unusable', async (t) => {
		const { client, cleanup } = setupCoreIpc()

		t.onTestFinished(() => {
			return cleanup()
		})

		const queryClient = new QueryClient()

		const wrapper = createClientApiWrapper({ clientApi: client, queryClient })

		const projectId = await client.createProject({
			name: 'project_1',
		})

		const singleProjectHook = renderHook(
			({ projectId }) => useSingleProject({ projectId }),
			{ wrapper, initialProps: { projectId } },
		)

		const closeProjectHook = renderHook(
			({ projectId }) => useCloseProject({ projectId }),
			{ wrapper, initialProps: { projectId } },
		)

		await waitFor(() => {
			assert(singleProjectHook.result.current !== null)
			assert(closeProjectHook.result.current !== null)
		})

		await act(async () => {
			await closeProjectHook.result.current.mutateAsync(undefined)
		})

		await expect(
			singleProjectHook.result.current.data.$getOwnRole(),
			'Cannot use top-level method',
		).rejects.toThrowError('Cannot await idle after closing')

		await expect(
			singleProjectHook.result.current.data.observation.getMany(),
			'Cannot use data type',
		).rejects.toThrowError('Cannot await idle after closing')

		// Ensure subsequent hook does not produce different result
		const otherSingleProjectHook = renderHook(
			({ projectId }) => useSingleProject({ projectId }),
			{ wrapper, initialProps: { projectId } },
		)

		await waitFor(() => {
			assert(singleProjectHook.result.current !== null)
		})

		await expect(
			otherSingleProjectHook.result.current.data.$getOwnRole(),
			'Cannot use top-level method',
		).rejects.toThrowError('Cannot await idle after closing')

		await expect(
			otherSingleProjectHook.result.current.data.observation.getMany(),
			'Cannot use data type',
		).rejects.toThrowError('Cannot await idle after closing')
	})

	test('causes other project-specific read hooks to populate error field', async (t) => {
		const { client, cleanup } = setupCoreIpc()

		t.onTestFinished(() => {
			return cleanup()
		})

		const queryClient = new QueryClient()

		const wrapper = createClientApiWrapper({ clientApi: client, queryClient })

		const projectId = await client.createProject({
			name: 'project_1',
		})

		const ownRoleHook = renderHook(
			({ projectId }) => useOwnRoleInProject({ projectId }),
			{ wrapper, initialProps: { projectId } },
		)

		const manyDocsHook = renderHook(
			({ docType, projectId }) => useManyDocs({ projectId, docType }),
			{
				wrapper,
				initialProps: {
					docType: 'observation' as WriteableDocumentType,
					projectId,
				},
			},
		)

		const closeProjectHook = renderHook(
			({ projectId }) => useCloseProject({ projectId }),
			{ wrapper, initialProps: { projectId } },
		)

		await waitFor(() => {
			assert(ownRoleHook.result.current !== null)
			assert(manyDocsHook.result.current !== null)
			assert(closeProjectHook.result.current !== null)
		})

		const ownRoleDataBefore = ownRoleHook.result.current.data
		const manyDocsHookDataBefore = manyDocsHook.result.current.data

		await act(async () => {
			await closeProjectHook.result.current.mutateAsync(undefined)
		})

		ownRoleHook.rerender({ projectId })
		manyDocsHook.rerender({ projectId, docType: 'observation' as const })

		await waitFor(() => {
			assert(ownRoleHook.result.current.isRefetching === false)
			assert(manyDocsHook.result.current.isRefetching === false)
		})

		expect(ownRoleHook.result.current.data).toStrictEqual(ownRoleDataBefore)
		expect(ownRoleHook.result.current.error).toStrictEqual(
			new Error('Cannot await idle after closing'),
		)
		expect(manyDocsHook.result.current.data).toStrictEqual(
			manyDocsHookDataBefore,
		)
		expect(manyDocsHook.result.current.error).toStrictEqual(
			new Error('Cannot await idle after closing'),
		)
	})

	test('does not affect usage of other non-closed projects', async (t) => {
		const { client, cleanup } = setupCoreIpc()

		t.onTestFinished(() => {
			return cleanup()
		})

		const queryClient = new QueryClient()

		const wrapper = createClientApiWrapper({ clientApi: client, queryClient })

		const projectId1 = await client.createProject({
			name: 'project_1',
		})

		const projectId2 = await client.createProject({
			name: 'project_2',
		})

		// Start with project 1
		const singleProjectHook = renderHook(
			({ projectId }) => useSingleProject({ projectId }),
			{ wrapper, initialProps: { projectId: projectId1 } },
		)

		const closeProjectHook = renderHook(
			({ projectId }) => useCloseProject({ projectId }),
			{ wrapper, initialProps: { projectId: projectId1 } },
		)

		await waitFor(() => {
			assert(singleProjectHook.result.current !== null)
			assert(closeProjectHook.result.current !== null)
		})

		await act(async () => {
			await closeProjectHook.result.current.mutateAsync(undefined)
		})

		// Switch to project 2
		singleProjectHook.rerender({ projectId: projectId2 })

		await waitFor(() => {
			assert(singleProjectHook.result.current !== null)
		})

		await expect(
			singleProjectHook.result.current.data.$getProjectSettings(),
			'Switched to project 2',
		).resolves.toMatchObject({ name: 'project_2' })

		// Check that project 2 instance can be called
		await expect(
			singleProjectHook.result.current.data.$getOwnRole(),
			'Can use top-level method',
		).resolves.toBeDefined()

		await expect(
			singleProjectHook.result.current.data.observation.getMany(),
			'Can use data type',
		).resolves.toBeDefined()
	})
})

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

		const wrapper = createClientApiWrapper({ clientApi: client, queryClient })

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

		const wrapper = createClientApiWrapper({ clientApi: client, queryClient })

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

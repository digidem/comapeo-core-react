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
	useSingleProject,
	useSyncState,
} from '../../src/index.js'
import { setupCoreIpc } from '../helpers/ipc.js'
import { createClientApiWrapper } from '../helpers/react.js'

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

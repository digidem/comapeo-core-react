// @ts-expect-error Vitest cannot resolve import when using `@comapeo/core/dist/roles`
import { CREATOR_ROLE } from '@comapeo/core/src/roles'
import { QueryClient } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { assert, describe, test } from 'vitest'

import {
	getProjectSettingsQueryKey,
	getProjectsQueryKey,
	useManyProjects,
	useProjectSettings,
	useSingleMember,
	useSingleProject,
} from '../../src/index.js'
import { setupCoreIpc } from '../helpers/ipc.js'
import { createClientApiWrapper } from '../helpers/react.js'

describe('useSingleProject()', async () => {
	test('works with different project ids', async (t) => {
		const queryClient = new QueryClient()
		const { client, cleanup } = setupCoreIpc()

		t.onTestFinished(() => {
			return cleanup()
		})

		// Need to create an initial project as part of the setup
		const project1Id = await client.createProject({ name: 'project_1' })

		const { result, rerender } = renderHook(
			({ projectId }: { projectId: string }) => useSingleProject({ projectId }),
			{
				initialProps: { projectId: project1Id },
				wrapper: createClientApiWrapper({ clientApi: client, queryClient }),
			},
		)

		// Since the hook is Suspense-based, we need to simulate waiting for the data to initially resolve
		await waitFor(() => {
			return result.current.data !== null
		})

		assert.isDefined(result.current.data, 'project api instance is available')

		const project1Settings = await result.current.data.$getProjectSettings()

		assert.strictEqual(
			project1Settings.name,
			'project_1',
			'project api instance retrieves information correctly',
		)

		const project2Id = await client.createProject({ name: 'project_2' })

		rerender({ projectId: project2Id })

		// TODO: Shouldn't `isRefetching` update here?

		// assert.strictEqual(
		// 	result.current.isRefetching,
		// 	true,
		// 	'switching project id causes project refetch',
		// )

		await waitFor(() => {
			return result.current.isRefetching === false
		})

		const project2Settings = await result.current.data.$getProjectSettings()

		assert.strictEqual(
			project2Settings.name,
			'project_2',
			'project api instance now retrieves information for project_2',
		)
	})
})

// TODO: Seems a bit flaky
describe('useManyProjects()', () => {
	test('retrieves initial settings of projects', async (t) => {
		const queryClient = new QueryClient()
		const { client, cleanup } = setupCoreIpc()

		t.onTestFinished(() => {
			return cleanup()
		})

		const { result, rerender } = renderHook(() => useManyProjects(), {
			wrapper: createClientApiWrapper({ clientApi: client, queryClient }),
		})

		// Since the hook is Suspense-based, we need to simulate waiting for the data to initially resolve
		await waitFor(() => {
			return result.current.data !== null
		})

		assert.strictEqual(result.current.data.length, 0, 'initial data is empty')

		// TODO: Replace with a mutation-based implementation
		const project1Id = await client
			.createProject({ name: 'project_1' })
			.then((projectId) => {
				// We explicitly do not return the promise here because we want to
				// check that the `isRefetching` field updates properly
				queryClient.invalidateQueries({ queryKey: getProjectsQueryKey() })
				return projectId
			})

		rerender()

		assert.strictEqual(
			result.current.isRefetching,
			true,
			'write operation starting causes isRefetching to be true',
		)

		await waitFor(() => {
			return result.current.isRefetching === false
		})

		rerender()

		assert.lengthOf(result.current.data, 1, 'data is of length 1')

		const project1Info = result.current.data.find(
			({ projectId }) => projectId === project1Id,
		)

		assert(project1Info, 'project 1 info is listed')

		assert.strictEqual(
			project1Info.name,
			'project_1',
			'project 1 info has expected name',
		)
		assert.isString(
			project1Info.createdAt,
			'project 1 info has createdAt field',
		)
		assert.isString(
			project1Info.updatedAt,
			'project 1 info has updatedAt field',
		)

		// TODO: Replace with a mutation-based implementation
		const project2Id = await client
			.createProject({ name: 'project_2' })
			.then((projectId) => {
				// We explicitly do not return the promise here because we want to
				// check that the `isRefetching` field updates properly
				queryClient.invalidateQueries({ queryKey: getProjectsQueryKey() })
				return projectId
			})

		rerender()

		assert.strictEqual(
			result.current.isRefetching,
			true,
			'write operation starting causes isRefetching to be true',
		)

		await waitFor(() => {
			return result.current.isRefetching === false
		})

		rerender()

		assert.lengthOf(result.current.data, 2, 'data is of length 2')

		const project2Info = result.current.data.find(
			({ projectId }) => projectId === project2Id,
		)

		assert(project2Info, 'project 2 info is listed')

		assert.strictEqual(
			project2Info.name,
			'project_2',
			'project 2 info has expected name',
		)
		assert.isString(
			project2Info.createdAt,
			'project 2 info has createdAt field',
		)
		assert.isString(
			project2Info.updatedAt,
			'project 2 info has updatedAt field',
		)
	})

	test('shows updated info when project settings change', async (t) => {
		const queryClient = new QueryClient()
		const { client, cleanup } = setupCoreIpc()

		t.onTestFinished(() => {
			return cleanup()
		})

		const { result, rerender } = renderHook(() => useManyProjects(), {
			wrapper: createClientApiWrapper({ clientApi: client, queryClient }),
		})

		// Since the hook is Suspense-based, we need to simulate waiting for the data to initially resolve
		await waitFor(() => {
			return result.current.data !== null
		})

		assert.strictEqual(result.current.data.length, 0, 'initial data is empty')

		// TODO: Replace with a mutation-based implementation
		const project1Id = await client
			.createProject({ name: 'project_1' })
			.then((projectId) => {
				// We explicitly do not return the promise here because we want to
				// check that the `isRefetching` field updates properly
				queryClient.invalidateQueries({ queryKey: getProjectsQueryKey() })
				return projectId
			})

		rerender()

		assert.strictEqual(
			result.current.isRefetching,
			true,
			'write operation starting causes isRefetching to be true',
		)

		await waitFor(() => {
			return result.current.isRefetching === false
		})

		rerender()

		assert.lengthOf(result.current.data, 1, 'data is of length 1')

		const project1InfoBefore = result.current.data.find(
			({ projectId }) => projectId === project1Id,
		)

		assert(project1InfoBefore, 'project 1 info is listed')

		assert.strictEqual(
			project1InfoBefore.name,
			'project_1',
			'project 1 info has initial name',
		)

		// TODO: Replace with a mutation-based implementation
		const projectApi = await client.getProject(project1Id)
		await projectApi
			.$setProjectSettings({ name: 'project_1_updated' })
			.then(() => {
				// We explicitly do not return the promise here because we want to
				// check that the `isRefetching` field updates properly
				queryClient.invalidateQueries({ queryKey: getProjectsQueryKey() })
			})

		rerender()

		assert.strictEqual(
			result.current.isRefetching,
			true,
			'write operation starting causes isRefetching to be true',
		)

		await waitFor(() => {
			return result.current.isRefetching === false
		})

		rerender()

		const project1InfoAfter = result.current.data.find(
			({ projectId }) => projectId === project1Id,
		)

		assert(project1InfoAfter)

		assert.strictEqual(
			project1InfoAfter.name,
			'project_1_updated',
			'project 1 info has updated name',
		)

		assert.notStrictEqual(
			project1InfoBefore.updatedAt,
			project1InfoAfter.updatedAt,
			'project 1 updatedAt field changes',
		)
	})
})

describe('useProjectSettings()', () => {
	test('works with initial project', async (t) => {
		const queryClient = new QueryClient()
		const { client, cleanup } = setupCoreIpc()

		t.onTestFinished(() => {
			return cleanup()
		})

		// Create initial project
		const project1Id = await client.createProject({ name: 'project_1' })

		const { result } = renderHook(
			({ projectId }: { projectId: string }) =>
				useProjectSettings({ projectId }),
			{
				initialProps: { projectId: project1Id },
				wrapper: createClientApiWrapper({ clientApi: client, queryClient }),
			},
		)

		// Since the hook is Suspense-based, we need to simulate waiting for the data to initially resolve
		await waitFor(() => {
			return result.current.data !== null
		})

		assert.strictEqual(
			result.current.data.name,
			'project_1',
			'data has expected name',
		)
	})

	test('updates when project settings are updated', async (t) => {
		const queryClient = new QueryClient()
		const { client, cleanup } = setupCoreIpc()

		t.onTestFinished(() => {
			return cleanup()
		})

		// Create initial project
		const project1Id = await client.createProject({ name: 'project_1' })

		const { result, rerender } = renderHook(
			({ projectId }: { projectId: string }) =>
				useProjectSettings({ projectId }),
			{
				initialProps: { projectId: project1Id },
				wrapper: createClientApiWrapper({ clientApi: client, queryClient }),
			},
		)

		// Since the hook is Suspense-based, we need to simulate waiting for the data to initially resolve
		await waitFor(() => {
			return result.current.data !== null
		})

		// TODO: Replace with a mutation-based implementation
		const project1Api = await client.getProject(project1Id)
		await project1Api
			.$setProjectSettings({ name: 'project_1_updated' })
			.then(() => {
				// We explicitly do not return the promise here because we want to
				// check that the `isRefetching` field updates properly
				queryClient.invalidateQueries({ queryKey: getProjectsQueryKey() })
				queryClient.invalidateQueries({
					queryKey: getProjectSettingsQueryKey({ projectId: project1Id }),
				})
			})

		rerender({ projectId: project1Id })

		assert.strictEqual(
			result.current.isRefetching,
			true,
			'write operation starting causes isRefetching to be true',
		)

		await waitFor(() => {
			return result.current.isRefetching === false
		})

		rerender({ projectId: project1Id })

		assert.strictEqual(
			result.current.data.name,
			'project_1_updated',
			'data has updated name',
		)
	})
})

describe('useSingleMember()', () => {
	test('retrieves self', async (t) => {
		const queryClient = new QueryClient()
		const { client, cleanup } = setupCoreIpc()

		t.onTestFinished(() => {
			return cleanup()
		})

		await client.setDeviceInfo({ name: 'device_1', deviceType: 'desktop' })
		const project1Id = await client.createProject({ name: 'project_1' })
		const project1Api = await client.getProject(project1Id)
		const myDeviceId = await project1Api.deviceId()

		const { result } = renderHook(
			({ projectId, deviceId }: { projectId: string; deviceId: string }) =>
				useSingleMember({ projectId, deviceId }),
			{
				initialProps: { projectId: project1Id, deviceId: myDeviceId },
				wrapper: createClientApiWrapper({ clientApi: client, queryClient }),
			},
		)

		// Since the hook is Suspense-based, we need to simulate waiting for the data to initially resolve
		await waitFor(() => {
			return result.current.data !== null
		})

		assert.strictEqual(result.current.data.deviceId, myDeviceId)
		assert.strictEqual(result.current.data.deviceType, 'desktop')
		assert.strictEqual(result.current.data.name, 'device_1')
		assert.deepStrictEqual(result.current.data.role, CREATOR_ROLE)
		assert.isString(result.current.data.joinedAt)
		assert.isUndefined(result.current.data.selfHostedServerDetails)
	})

	test.todo('retrieves other members')
})

describe('useManyMembers()', () => {
	test.todo('retrieves all members')
})

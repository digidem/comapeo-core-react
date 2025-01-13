// @ts-expect-error Vitest cannot resolve import when using `@comapeo/core/dist/roles`
import { CREATOR_ROLE } from '@comapeo/core/src/roles.js'
import { QueryClient } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { assert, describe, test } from 'vitest'

import {
	useCreateProject,
	useManyMembers,
	useManyProjects,
	useOwnDeviceInfo,
	useProjectSettings,
	useSetOwnDeviceInfo,
	useSingleMember,
	useSingleProject,
	useUpdateProjectSettings,
} from '../../src/index.js'
import { setupCoreIpc } from '../helpers/ipc.js'
import { createClientApiWrapper } from '../helpers/react.js'

test('project creation works', async (t) => {
	const queryClient = new QueryClient()
	const { client, cleanup } = setupCoreIpc()

	t.onTestFinished(() => {
		return cleanup()
	})

	const createProjectHook = renderHook(() => useCreateProject(), {
		wrapper: createClientApiWrapper({ clientApi: client, queryClient }),
	})

	// 1. Initial state
	assert.strictEqual(
		createProjectHook.result.current.status,
		'idle',
		'write hook has expected initial status',
	)

	// 2. Simulate user interaction
	let createdProjectId: string | undefined

	act(() => {
		createProjectHook.result.current.mutate(
			{ name: 'project_1' },
			{
				onSuccess: (result) => {
					createdProjectId = result
				},
			},
		)
	})

	// 3. Write hook lifecycle
	// TODO: Ideally wait for pending status first
	await waitFor(() => {
		assert.strictEqual(createProjectHook.result.current.status, 'success')
	})

	assert(typeof createdProjectId === 'string', 'created project id exists')
})

describe('many projects', () => {
	test('basic read', async (t) => {
		const queryClient = new QueryClient()
		const { client, cleanup } = setupCoreIpc()

		t.onTestFinished(() => {
			return cleanup()
		})

		const wrapper = createClientApiWrapper({ clientApi: client, queryClient })

		const createProjectHook = renderHook(() => useCreateProject(), {
			wrapper,
		})

		const manyProjectsHook = renderHook(() => useManyProjects(), {
			wrapper,
		})

		// Since useManyProjects() is Suspense-based, we need to simulate waiting for the data to initially resolve
		await waitFor(() => {
			assert(manyProjectsHook.result.current.data !== null)
		})

		// 1. Initial state
		assert.strictEqual(
			manyProjectsHook.result.current.data.length,
			0,
			'initial data is empty',
		)

		// 2. Simulate a user interaction
		let createdProjectId: string | undefined

		act(() => {
			createProjectHook.result.current.mutate(
				{ name: 'project_1' },
				{
					onSuccess: (result) => {
						createdProjectId = result
					},
				},
			)
		})

		// 3. Write hook lifecycle
		// TODO: Ideally wait for pending status first
		await waitFor(() => {
			assert.strictEqual(createProjectHook.result.current.status, 'success')
		})

		// 4. Read hook lifecycle
		// TODO: Ideally wait for isRefetching to be true first
		await waitFor(() => {
			assert.strictEqual(manyProjectsHook.result.current.isRefetching, false)
		})

		assert(typeof createdProjectId === 'string', 'created project id exists')
		assert.strictEqual(
			manyProjectsHook.result.current.data.length,
			1,
			'many projects hook has updated data',
		)
		assert.include(
			manyProjectsHook.result.current.data[0],
			{
				projectId: createdProjectId,
				name: 'project_1',
			},
			'many projects hook data contains created project',
		)
	})
})

describe('single project', () => {
	test('basic read', async (t) => {
		const queryClient = new QueryClient()
		const { client, cleanup } = setupCoreIpc()

		t.onTestFinished(() => {
			return cleanup()
		})

		const wrapper = createClientApiWrapper({ clientApi: client, queryClient })

		const createProjectHook = renderHook(() => useCreateProject(), {
			wrapper,
		})

		// 1. Create initial project
		const project1Id = await act(() => {
			return new Promise<string>((res, rej) => {
				createProjectHook.result.current.mutate(
					{ name: 'project_1' },
					{ onSuccess: res, onError: rej },
				)
			})
		})

		// 2. Load project 1
		const singleProjectReadHook = renderHook(
			({ projectId }: { projectId: string }) => useSingleProject({ projectId }),
			{
				initialProps: { projectId: project1Id },
				wrapper: createClientApiWrapper({ clientApi: client, queryClient }),
			},
		)

		// Since useSingleProject() is Suspense-based, we need to simulate waiting for the data to initially resolve
		await waitFor(() => {
			assert(singleProjectReadHook.result.current.data !== null)
		})

		// 3. Confirm that project instance points to project 1
		const project1Settings =
			await singleProjectReadHook.result.current.data.$getProjectSettings()

		assert.strictEqual(
			project1Settings.name,
			'project_1',
			'project instance has expected settings of project 1',
		)

		// 4. Create project 2
		let project2Id: string | undefined

		act(() => {
			createProjectHook.result.current.mutate(
				{ name: 'project_2' },
				{
					onSuccess: (result) => {
						project2Id = result
					},
				},
			)
		})

		// TODO: Ideally wait for pending status first
		await waitFor(() => {
			assert.strictEqual(createProjectHook.result.current.status, 'success')
		})

		assert(typeof project2Id === 'string', 'created project id 2 exists')

		// 5. Switch to project 2
		singleProjectReadHook.rerender({ projectId: project2Id })

		// TODO: Ideally wait for isRefetching to be true first
		await waitFor(() => {
			assert.strictEqual(
				singleProjectReadHook.result.current.isRefetching,
				false,
			)
		})

		// 6. Confirm that project instance points to project 2
		const project2Settings =
			await singleProjectReadHook.result.current.data.$getProjectSettings()

		assert.strictEqual(
			project2Settings.name,
			'project_2',
			'project instance has expected settings of project 2',
		)
	})

	test('updates when a project changes settings', async (t) => {
		const queryClient = new QueryClient()
		const { client, cleanup } = setupCoreIpc()

		t.onTestFinished(() => {
			return cleanup()
		})

		const wrapper = createClientApiWrapper({ clientApi: client, queryClient })

		const createProjectHook = renderHook(() => useCreateProject(), {
			wrapper,
		})

		// 1. Create initial project
		const project1Id = await act(() => {
			return new Promise<string>((res, rej) => {
				createProjectHook.result.current.mutate(
					{ name: 'project_1' },
					{ onSuccess: res, onError: rej },
				)
			})
		})

		// 2. Set up project-specific hooks
		const updateProjectSettingsHook = renderHook(
			({ projectId }: { projectId: string }) =>
				useUpdateProjectSettings({ projectId }),
			{
				initialProps: { projectId: project1Id },
				wrapper,
			},
		)
		const singleProjectHook = renderHook(
			({ projectId }: { projectId: string }) => useSingleProject({ projectId }),
			{
				initialProps: { projectId: project1Id },
				wrapper,
			},
		)

		// Since useSingleProject() is Suspense-based, we need to simulate waiting for the data to initially resolve
		await waitFor(() => {
			assert(singleProjectHook.result.current.data !== null)
		})

		// 3. Assert initial hook states
		assert.strictEqual(
			updateProjectSettingsHook.result.current.status,
			'idle',
			'update project settings hook has expected initial status',
		)

		// 4. Simulate user interaction
		let updatedProject1Settings
		act(() => {
			updateProjectSettingsHook.result.current.mutate(
				{ name: 'project_1_updated' },
				{
					onSuccess: (result) => {
						updatedProject1Settings = result
					},
				},
			)
		})

		// 5. Write hook lifecycle
		// TODO: Ideally check for status === 'pending' before this
		await waitFor(() => {
			assert.strictEqual(
				updateProjectSettingsHook.result.current.status,
				'success',
			)
		})

		// 6. Read hook lifecycle
		// TODO: Ideally check for isRefetching === true before this
		await waitFor(() => {
			assert.strictEqual(singleProjectHook.result.current.isRefetching, false)
		})

		const project1Settings =
			await singleProjectHook.result.current.data.$getProjectSettings()

		assert.deepStrictEqual(
			project1Settings,
			updatedProject1Settings,
			'project instance retrieves expected project settings',
		)
	})
})

describe('project settings', () => {
	test('basic read and write', async (t) => {
		const queryClient = new QueryClient()
		const { client, cleanup } = setupCoreIpc()

		t.onTestFinished(() => {
			return cleanup()
		})

		const wrapper = createClientApiWrapper({ clientApi: client, queryClient })

		const createProjectHook = renderHook(() => useCreateProject(), {
			wrapper,
		})

		// 1. Create initial project
		const project1Id = await act(() => {
			return new Promise<string>((res, rej) => {
				createProjectHook.result.current.mutate(
					{ name: 'project_1' },
					{ onSuccess: res, onError: rej },
				)
			})
		})

		// 2. Set up project-specific hooks
		const getProjectSettingsHook = renderHook(
			({ projectId }) => useProjectSettings({ projectId }),
			{ wrapper, initialProps: { projectId: project1Id } },
		)
		const updateProjectSettingsHook = renderHook(
			({ projectId }) => useUpdateProjectSettings({ projectId }),
			{ wrapper, initialProps: { projectId: project1Id } },
		)

		// Wait for Suspense to resolve
		await waitFor(() => {
			assert(getProjectSettingsHook.result.current.data !== null)
		})

		// 3. Initial state
		assert.deepStrictEqual(
			getProjectSettingsHook.result.current.data.name,
			'project_1',
			'project settings read hook has expected initial name',
		)

		// 4. Simulate user interaction
		act(() => {
			updateProjectSettingsHook.result.current.mutate({
				name: 'project_1_updated',
			})
		})

		// 5. Write hook lifecycle
		// TODO: Ideally check for pending status before this
		await waitFor(() => {
			assert.strictEqual(
				updateProjectSettingsHook.result.current.status,
				'success',
			)
		})

		// 6. Read hook lifecycle
		// TODO: Ideally check isRefetching is true before this
		await waitFor(() => {
			assert.strictEqual(
				getProjectSettingsHook.result.current.isRefetching,
				false,
			)
		})

		assert.deepStrictEqual(
			getProjectSettingsHook.result.current.data.name,
			'project_1_updated',
			'project settings read hook has expected updated name',
		)
	})
})

describe('multiple members', () => {
	test('gets own device', async (t) => {
		const queryClient = new QueryClient()
		const { client, cleanup } = setupCoreIpc()

		t.onTestFinished(() => {
			return cleanup()
		})

		const wrapper = createClientApiWrapper({ clientApi: client, queryClient })

		const ownDeviceInfoHook = renderHook(() => useOwnDeviceInfo(), { wrapper })
		const setOwnDeviceInfoHook = renderHook(() => useSetOwnDeviceInfo(), {
			wrapper,
		})

		await waitFor(() => {
			assert(ownDeviceInfoHook.result.current.data !== null)
		})

		const ownDeviceId = ownDeviceInfoHook.result.current.data.deviceId

		const createProjectHook = renderHook(() => useCreateProject(), {
			wrapper,
		})

		// 1. Create initial project
		const project1Id = await act(() => {
			return new Promise<string>((res, rej) => {
				createProjectHook.result.current.mutate(
					{ name: 'project_1' },
					{ onSuccess: res, onError: rej },
				)
			})
		})

		// 2. Set up project-specific hooks
		const manyMembersHook = renderHook(
			({ projectId }) => useManyMembers({ projectId }),
			{
				wrapper,
				initialProps: { projectId: project1Id },
			},
		)

		// Wait for Suspense to resolve
		await waitFor(() => {
			assert(manyMembersHook.result.current.data !== null)
		})

		// 3. Initial state
		assert.strictEqual(
			manyMembersHook.result.current.data.length,
			1,
			'newly created project has only 1 member',
		)

		{
			const ownDeviceMember = manyMembersHook.result.current.data.find(
				(m) => m.deviceId === ownDeviceId,
			)

			assert.deepInclude(
				ownDeviceMember,
				{ deviceId: ownDeviceId, role: CREATOR_ROLE },
				'project member is own device with expected properties',
			)
		}

		// 4. Update own device info
		act(() => {
			setOwnDeviceInfoHook.result.current.mutate({
				name: 'me',
				deviceType: 'desktop',
			})
		})

		// 5. Write hook lifecycle
		// TODO: Ideally check for pending status before this
		await waitFor(() => {
			assert.strictEqual(setOwnDeviceInfoHook.result.current.status, 'success')
		})

		// 6. Read hook lifecycle
		// TODO: Ideally check isRefetching is true before this
		await waitFor(() => {
			assert.strictEqual(manyMembersHook.result.current.isRefetching, false)
		})

		{
			const ownDeviceMember = manyMembersHook.result.current.data.find(
				(m) => m.deviceId === ownDeviceId,
			)

			assert.deepInclude(
				ownDeviceMember,
				{
					deviceId: ownDeviceId,
					role: CREATOR_ROLE,
					name: 'me',
					deviceType: 'desktop',
				},
				'own device from many members hook updates after updating own device info',
			)
		}
	})

	test.todo('updates after member joins')
	test.todo('updates after member leaves')
})

describe('single member', () => {
	test('gets own device', async (t) => {
		const queryClient = new QueryClient()
		const { client, cleanup } = setupCoreIpc()

		t.onTestFinished(() => {
			return cleanup()
		})

		const wrapper = createClientApiWrapper({ clientApi: client, queryClient })

		const ownDeviceInfoHook = renderHook(() => useOwnDeviceInfo(), { wrapper })
		const setOwnDeviceInfoHook = renderHook(() => useSetOwnDeviceInfo(), {
			wrapper,
		})

		await waitFor(() => {
			assert(ownDeviceInfoHook.result.current.data !== null)
		})

		const ownDeviceId = ownDeviceInfoHook.result.current.data.deviceId

		const createProjectHook = renderHook(() => useCreateProject(), {
			wrapper,
		})

		// 1. Initial setup
		await act(() => {
			return new Promise((res, rej) => {
				setOwnDeviceInfoHook.result.current.mutate(
					{
						name: 'device_1',
						deviceType: 'device_type_unspecified',
					},
					{ onError: rej, onSuccess: res },
				)
			})
		})

		const project1Id = await act(() => {
			return new Promise<string>((res, rej) => {
				createProjectHook.result.current.mutate(
					{ name: 'project_1' },
					{ onSuccess: res, onError: rej },
				)
			})
		})

		// 2. Set up project-specific hooks
		const singleMemberHook = renderHook(
			({ projectId, deviceId }) => useSingleMember({ projectId, deviceId }),
			{
				wrapper,
				initialProps: { projectId: project1Id, deviceId: ownDeviceId },
			},
		)

		// Wait for Suspense to resolve
		await waitFor(() => {
			assert(singleMemberHook.result.current.data !== null)
		})

		// 3. Initial state
		assert.deepInclude(singleMemberHook.result.current.data, {
			name: 'device_1',
			deviceType: 'device_type_unspecified',
			deviceId: ownDeviceId,
			role: CREATOR_ROLE,
		})

		// 4. Simulate user interaction
		act(() => {
			setOwnDeviceInfoHook.result.current.mutate({
				name: 'device_1_updated',
				deviceType: 'desktop',
			})
		})

		// 5. Write hook lifecycle
		// TODO: Ideally check for pending status before this
		await waitFor(() => {
			assert.strictEqual(setOwnDeviceInfoHook.result.current.status, 'success')
		})

		// 6. Read hook lifecycle
		// TODO: Ideally check isRefetching is true before this
		await waitFor(() => {
			assert.strictEqual(singleMemberHook.result.current.isRefetching, false)
		})

		assert.deepInclude(
			singleMemberHook.result.current.data,
			{
				deviceId: ownDeviceId,
				role: CREATOR_ROLE,
				name: 'device_1_updated',
				deviceType: 'desktop',
			},
			'single member read hook updates after updating own device info',
		)
	})

	test.todo('gets other members after invite flow')
})

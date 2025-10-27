import { createRequire } from 'node:module'
import type { Preset } from '@comapeo/schema'
import { generate } from '@mapeo/mock-data'
import { describe, expect, it } from 'vitest'

import { getPresetsSelection } from '../../src/lib/presets.js'
import { setupCoreIpc } from '../helpers/ipc.js'

const require = createRequire(import.meta.url)
const DEFAULT_CONFIG_PATH = require.resolve('@mapeo/default-config')

function makePreset(overrides: Partial<Preset>): Preset {
	const preset = generate('preset', { count: 1 })[0]!
	return {
		...preset,
		...overrides,
	}
}

describe('getPresetsSelection', () => {
	const allPresets: Array<Preset> = [
		makePreset({ docId: 'a', name: 'Alpha' }),
		makePreset({ docId: 'b', name: 'beta' }),
		makePreset({ docId: 'c', name: 'Charlie' }),
		makePreset({ docId: 'l1', name: 'Line One' }),
		makePreset({ docId: 'l2', name: 'Line Two' }),
		makePreset({ docId: 'both-1', name: 'Both One' }),
	]

	it('uses provided order when orderedPresetIds is given', () => {
		const result = getPresetsSelection(allPresets, ['c', 'a', 'both-1'])

		expect(result.map((r) => r.docId)).toEqual(['c', 'a', 'both-1'])
	})

	it('falls back to alphabetical when orderedPresetIds is missing or empty', () => {
		const resultMissing = getPresetsSelection(allPresets, undefined)
		expect(resultMissing.map((r) => r.name)).toEqual([
			'Alpha',
			'beta',
			'Both One',
			'Charlie',
			'Line One',
			'Line Two',
		])

		const resultEmpty = getPresetsSelection(allPresets, [])
		expect(resultEmpty.map((r) => r.name)).toEqual([
			'Alpha',
			'beta',
			'Both One',
			'Charlie',
			'Line One',
			'Line Two',
		])
	})

	it('ignores unknown IDs; if none match, falls back to alphabetical', () => {
		const resultNoMatches = getPresetsSelection(allPresets, ['zzz'])
		expect(resultNoMatches.map((r) => r.name)).toEqual([
			'Alpha',
			'beta',
			'Both One',
			'Charlie',
			'Line One',
			'Line Two',
		])

		const resultSomeMatches = getPresetsSelection(allPresets, ['zzz', 'b'])
		expect(resultSomeMatches.map((r) => r.docId)).toEqual(['b'])
	})

	it('returns only matching presets in the specified order', () => {
		const result = getPresetsSelection(allPresets, ['l2', 'both-1', 'a'])
		expect(result.map((r) => r.docId)).toEqual(['l2', 'both-1', 'a'])
	})

	it('works with default categories (@mapeo/default-config@6.0.0)', async (t) => {
		const { client, cleanup } = setupCoreIpc()

		t.onTestFinished(() => {
			return cleanup()
		})

		const projectId = await client.createProject({
			configPath: DEFAULT_CONFIG_PATH,
		})

		const project = await client.getProject(projectId)

		const { defaultPresets } = await project.$getProjectSettings()

		const presets = await project.preset.getMany()

		const pointResult = getPresetsSelection(presets, defaultPresets?.point)
		const lineResult = getPresetsSelection(presets, defaultPresets?.line)

		// Cannot use docId because it will change every time the test runs.
		// Checking the names should be sufficient in this case
		expect(pointResult.map((p) => p.name)).toMatchInlineSnapshot(`
			[
			  "New point",
			  "Airstrip",
			  "Animal",
			  "Boundary",
			  "Building",
			  "Camp",
			  "Cave",
			  "Clay",
			  "Community",
			  "Fishing Site",
			  "Gathering Site",
			  "Hills",
			  "House",
			  "Hunting Site",
			  "Lake",
			  "Palm",
			  "Path",
			  "Plant",
			  "River",
			  "Salt lick",
			  "Special site",
			  "Stream",
			  "Farmland",
			  "Threat",
			  "Tree",
			  "Waterfall",
			]
		`)
		expect(lineResult.map((p) => p.name)).toMatchInlineSnapshot(`
			[
			  "New line",
			  "Boundary",
			  "River",
			  "Path",
			  "Stream",
			  "Threat",
			]
		`)
	})
})

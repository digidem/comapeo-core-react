import type { MapeoDoc, ProjectSettings } from '@comapeo/schema'
import { describe, expect, it } from 'vitest'

import { sortPresetsByDefaultOrder } from '../../src/lib/presets.js'

type PresetDoc = Extract<MapeoDoc, { schemaName: 'preset' }>

function makePreset(
	docId: string,
	name: string,
	geometry: Array<'point' | 'line'>,
): PresetDoc {
	return { docId, name, geometry } as unknown as PresetDoc
}

function settingsWith(
	overrides: Partial<ProjectSettings['defaultPresets']>,
): ProjectSettings['defaultPresets'] {
	const base: ProjectSettings['defaultPresets'] = {
		point: [],
		line: [],
		area: [],
		vertex: [],
		relation: [],
	}
	return { ...base, ...overrides }
}

describe('sortPresetsByDefaultOrder', () => {
	const allPresets: Array<PresetDoc> = [
		makePreset('a', 'Alpha', ['point']),
		makePreset('b', 'beta', ['point']),
		makePreset('c', 'Charlie', ['point']),
		makePreset('l1', 'Line One', ['line']),
		makePreset('l2', 'Line Two', ['line']),
		makePreset('both-1', 'Both One', ['point', 'line']),
	]

	it('uses defaultPresets order when provided', () => {
		const settings = settingsWith({ point: ['c', 'a', 'both-1'] })
		const result = sortPresetsByDefaultOrder(allPresets, settings, 'point')

		expect(result.map((r) => r.docId)).toEqual(['c', 'a', 'both-1'])
	})

	it('falls back to alphabetical when defaultPresets is missing or empty', () => {
		const resultMissing = sortPresetsByDefaultOrder(
			allPresets,
			undefined,
			'point',
		)
		expect(resultMissing.map((r) => r.name)).toEqual([
			'Alpha',
			'beta',
			'Both One',
			'Charlie',
		])

		const resultEmpty = sortPresetsByDefaultOrder(
			allPresets,
			settingsWith({ point: [] }),
			'point',
		)
		expect(resultEmpty.map((r) => r.name)).toEqual([
			'Alpha',
			'beta',
			'Both One',
			'Charlie',
		])
	})

	it('ignores unknown IDs; if none match, falls back to alphabetical', () => {
		const settingsNoMatches = settingsWith({ point: ['zzz'] })
		const resultNoMatches = sortPresetsByDefaultOrder(
			allPresets,
			settingsNoMatches,
			'point',
		)
		expect(resultNoMatches.map((r) => r.name)).toEqual([
			'Alpha',
			'beta',
			'Both One',
			'Charlie',
		])

		const settingsSomeMatches = settingsWith({ point: ['zzz', 'b'] })
		const resultSomeMatches = sortPresetsByDefaultOrder(
			allPresets,
			settingsSomeMatches,
			'point',
		)
		expect(resultSomeMatches.map((r) => r.docId)).toEqual(['b'])
	})

	it('filters by geometry type (point vs line)', () => {
		const pointSettings = settingsWith({ point: ['c', 'a'] })
		const pointResult = sortPresetsByDefaultOrder(
			allPresets,
			pointSettings,
			'point',
		)
		expect(pointResult.map((r) => r.docId)).toEqual(['c', 'a'])

		const lineSettings = settingsWith({ line: ['l2', 'both-1'] })
		const lineResult = sortPresetsByDefaultOrder(
			allPresets,
			lineSettings,
			'line',
		)
		expect(lineResult.map((r) => r.docId)).toEqual(['l2', 'both-1'])
	})
})

import type { MapeoDoc } from '@comapeo/schema'
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

describe('sortPresetsByDefaultOrder', () => {
	const allPresets: Array<PresetDoc> = [
		makePreset('a', 'Alpha', ['point']),
		makePreset('b', 'beta', ['point']),
		makePreset('c', 'Charlie', ['point']),
		makePreset('l1', 'Line One', ['line']),
		makePreset('l2', 'Line Two', ['line']),
		makePreset('both-1', 'Both One', ['point', 'line']),
	]

	it('uses provided order when orderedPresetIds is given', () => {
		const result = sortPresetsByDefaultOrder(allPresets, ['c', 'a', 'both-1'])

		expect(result.map((r) => r.docId)).toEqual(['c', 'a', 'both-1'])
	})

	it('falls back to alphabetical when orderedPresetIds is missing or empty', () => {
		const resultMissing = sortPresetsByDefaultOrder(allPresets, undefined)
		expect(resultMissing.map((r) => r.name)).toEqual([
			'Alpha',
			'beta',
			'Both One',
			'Charlie',
			'Line One',
			'Line Two',
		])

		const resultEmpty = sortPresetsByDefaultOrder(allPresets, [])
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
		const resultNoMatches = sortPresetsByDefaultOrder(allPresets, ['zzz'])
		expect(resultNoMatches.map((r) => r.name)).toEqual([
			'Alpha',
			'beta',
			'Both One',
			'Charlie',
			'Line One',
			'Line Two',
		])

		const resultSomeMatches = sortPresetsByDefaultOrder(allPresets, [
			'zzz',
			'b',
		])
		expect(resultSomeMatches.map((r) => r.docId)).toEqual(['b'])
	})

	it('returns only matching presets in the specified order', () => {
		const result = sortPresetsByDefaultOrder(allPresets, ['l2', 'both-1', 'a'])
		expect(result.map((r) => r.docId)).toEqual(['l2', 'both-1', 'a'])
	})
})

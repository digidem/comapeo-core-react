import type { MapeoDoc } from '@comapeo/schema' with { 'resolution-mode': 'import' }

type PresetDoc = Extract<MapeoDoc, { schemaName: 'preset' }>

type Geometry = 'point' | 'area' | 'vertex' | 'line' | 'relation'

type DefaultPresetsConfig = {
	[Value in Geometry]: Array<string>
}

export function sortPresetsByDefaultOrder(
	presets: Array<PresetDoc>,
	defaultPresets: DefaultPresetsConfig | undefined,
	geometryType: Geometry,
): Array<PresetDoc> {
	const byGeometry = presets.filter((p) => p.geometry.includes(geometryType))

	const alphaSorted = [...byGeometry].sort((a, b) =>
		a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
	)
	const defaultPresetsExist =
		defaultPresets?.[geometryType] && defaultPresets[geometryType].length > 0
			? defaultPresets[geometryType]
			: null

	if (!defaultPresetsExist) return alphaSorted

	const byDefaultPreset = new Map(byGeometry.map((p) => [p.docId, p]))

	const orderedByDefaultPresets = defaultPresetsExist
		.map((id) => byDefaultPreset.get(id))
		.filter((p): p is PresetDoc => Boolean(p))

	return orderedByDefaultPresets.length > 0
		? orderedByDefaultPresets
		: alphaSorted
}

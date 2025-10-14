import type { Preset } from '@comapeo/schema' with { 'resolution-mode': 'import' }

/**
 * Internal helper to sort presets alphabetically by name (case-insensitive).
 */
function sortByName(presets: Array<Preset>): Array<Preset> {
	return [...presets].sort((a, b) =>
		a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
	)
}

export function getPresetsSelection(
	presets: Array<Preset>,
	orderedPresetIds: Array<string> = [],
): Array<Preset> {
	if (orderedPresetIds.length === 0) {
		return sortByName(presets)
	}

	const presetsSelection: Array<Preset> = []
	for (const presetId of orderedPresetIds) {
		const preset = presets.find((p) => p.docId === presetId)
		if (preset) {
			presetsSelection.push(preset)
		}
	}

	if (presetsSelection.length === 0) {
		return sortByName(presets)
	}

	return presetsSelection
}

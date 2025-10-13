import type { MapeoDoc } from '@comapeo/schema' with { 'resolution-mode': 'import' }

type PresetDoc = Extract<MapeoDoc, { schemaName: 'preset' }>

/**
 * Sort presets based on a custom order defined by an array of preset IDs.
 *
 * @param presets Array of preset documents to sort
 * @param orderedPresetIds Optional array of preset document IDs defining the desired order.
 *                         Corresponds to one of the arrays in `projectSettings.defaultPresets`
 *                         (e.g., `defaultPresets.point` or `defaultPresets.line`)
 * @returns Sorted array of presets
 *
 * - If `orderedPresetIds` is provided and has matching presets, returns only those presets in the specified order
 * - If `orderedPresetIds` is missing, empty, or has no matches, returns all presets sorted alphabetically by name (case-insensitive)
 *
 * **Note:** This function does NOT filter by geometry type. Consumers should filter presets by geometry before or after sorting.
 *
 * @example
 * ```tsx
 * import { sortPresetsByDefaultOrder, useManyDocs, useProjectSettings } from '@comapeo/core-react'
 *
 * function ObservationCategoryChooser() {
 *   const { data: presets } = useManyDocs({ projectId, docType: 'preset' })
 *   const { data: settings } = useProjectSettings({ projectId })
 *
 *   // Sort presets according to the point preset order
 *   const sortedPresets = sortPresetsByDefaultOrder(
 *     presets,
 *     settings.defaultPresets.point
 *   )
 *   // Returns presets in the order specified by settings.defaultPresets.point
 * }
 *
 * function TrackCategoryChooser() {
 *   const { data: presets } = useManyDocs({ projectId, docType: 'preset' })
 *   const { data: settings } = useProjectSettings({ projectId })
 *
 *   // Sort presets according to the line preset order
 *   const sortedPresets = sortPresetsByDefaultOrder(
 *     presets,
 *     settings.defaultPresets.line
 *   )
 * }
 * ```
 */
export function sortPresetsByDefaultOrder(
	presets: Array<PresetDoc>,
	orderedPresetIds?: Array<string>,
): Array<PresetDoc> {
	if (!orderedPresetIds || orderedPresetIds.length === 0) {
		return [...presets].sort((a, b) =>
			a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
		)
	}
	const presetMap = new Map(presets.map((p) => [p.docId, p]))
	const orderedPresets = orderedPresetIds
		.map((id) => presetMap.get(id))
		.filter((p): p is PresetDoc => Boolean(p))

	if (orderedPresets.length === 0) {
		return [...presets].sort((a, b) =>
			a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
		)
	}

	return orderedPresets
}

import type { UseMutationResult } from '@tanstack/react-query'
import type { DistributedPick } from 'type-fest'

const PICKED_MUTATION_RESULT_KEYS = [
	'error',
	'mutate',
	'mutateAsync',
	'reset',
	'status',
] as const satisfies ReadonlyArray<keyof UseMutationResult>

/**
 * Filters a `UseMutationResult` to only include a subset of its keys, and uses
 * `DistributedPick` to preserve the discriminated union types of the mutation
 * result based on the `status` property.
 */
export function filterMutationResult<
	TResult extends // eslint-disable-next-line @typescript-eslint/no-explicit-any
		UseMutationResult<any, any, any, any>,
>(mutationResult: TResult) {
	const filteredResult = {} as DistributedPick<
		TResult,
		(typeof PICKED_MUTATION_RESULT_KEYS)[number]
	>
	for (const key of PICKED_MUTATION_RESULT_KEYS) {
		filteredResult[key] = mutationResult[key]
	}
	return filteredResult
}

// Vendored from https://github.com/sindresorhus/filter-obj/blob/7bcfe43cb7bfa8fd553110e0a04043e73f5e78f9/index.js
// With distributive pick support from https://github.com/sindresorhus/filter-obj/pull/39

import type { Simplify } from 'type-fest'

type DistributivePick<Value, Key extends keyof Value> = Value extends unknown
	? Pick<Value, Key>
	: never

export function pick<
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	ObjectType extends Record<PropertyKey, any>,
	IncludedKeys extends keyof ObjectType,
>(
	object: ObjectType,
	// eslint-disable-next-line @typescript-eslint/array-type
	keys: readonly IncludedKeys[],
): Simplify<DistributivePick<ObjectType, IncludedKeys>> {
	const result = {} as DistributivePick<ObjectType, IncludedKeys>
	for (const key of keys) {
		const descriptor = Object.getOwnPropertyDescriptor(object, key)
		if (!descriptor?.enumerable) {
			continue
		}
		Object.defineProperty(result, key, descriptor)
	}
	return result
}

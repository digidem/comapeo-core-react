import type { ComapeoDoc, ComapeoValue } from '@comapeo/schema' with {
	'resolution-mode': 'import',
}

export type WriteableDocType = Extract<
	ComapeoDoc['schemaName'],
	'field' | 'observation' | 'preset' | 'track' | 'remoteDetectionAlert'
>
export type WriteableValue<D extends WriteableDocType> = Extract<
	ComapeoValue,
	{ schemaName: D }
>
export type WriteableDoc<D extends WriteableDocType> = Extract<
	ComapeoValue,
	{ schemaName: D }
>

export {}

import type { MapeoDoc, MapeoValue } from '@comapeo/schema' with {
	'resolution-mode': 'import',
}

export type WriteableDocumentType = Extract<
	MapeoDoc['schemaName'],
	'field' | 'observation' | 'preset' | 'track' | 'remoteDetectionAlert'
>
export type WriteableValue<D extends WriteableDocumentType> = Extract<
	MapeoValue,
	{ schemaName: D }
>
export type WriteableDocument<D extends WriteableDocumentType> = Extract<
	MapeoDoc,
	{ schemaName: D }
>

export {}

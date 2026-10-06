import type { ComapeoDoc, ComapeoValue } from '@comapeo/core/schema.js'

export type WriteableDocumentType = Extract<
	ComapeoDoc['schemaName'],
	'field' | 'observation' | 'preset' | 'track' | 'remoteDetectionAlert'
>
export type WriteableValue<D extends WriteableDocumentType> = Extract<
	ComapeoValue,
	{ schemaName: D }
>
export type WriteableDocument<D extends WriteableDocumentType> = Extract<
	ComapeoDoc,
	{ schemaName: D }
>

export {}

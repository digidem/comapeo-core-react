import type { ComapeoDoc, ComapeoValue } from '@comapeo/core/schema.js'
import type { ComapeoCoreClientApi } from '@comapeo/ipc'
import type { ComapeoProjectClientApi } from '@comapeo/ipc/client.js'

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

// TODO: Export from core
export type JoinRequest = Awaited<
	ReturnType<ComapeoCoreClientApi['inviteLinks']['getJoinRequestById']>
>

// TODO: Export from core
export type JoinRequestUpdate = Parameters<
	Parameters<ComapeoCoreClientApi['inviteLinks']['on']>[1]
>[0]

// TODO: Export from core
export type InviteLink = Awaited<
	ReturnType<ComapeoProjectClientApi['$member']['listInviteLinks']>
>[number]

// TODO: Export from core
export type InviteOptions = Omit<
	Parameters<ComapeoProjectClientApi['$member']['createInviteLink']>[0],
	'__testOnlyInviteId'
>

// TODO: Export from core
export type InviteDecision = Awaited<
	ReturnType<ComapeoProjectClientApi['$member']['acceptInviteLinkRequest']>
>

export {}

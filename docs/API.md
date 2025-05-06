## Functions

- [ClientApiProvider](#clientapiprovider)
- [useClientApi](#useclientapi)
- [useOwnDeviceInfo](#useowndeviceinfo)
- [useIsArchiveDevice](#useisarchivedevice)
- [useSetOwnDeviceInfo](#usesetowndeviceinfo)
- [useSetIsArchiveDevice](#usesetisarchivedevice)
- [useProjectSettings](#useprojectsettings)
- [useSingleProject](#usesingleproject)
- [useManyProjects](#usemanyprojects)
- [useSingleMember](#usesinglemember)
- [useManyMembers](#usemanymembers)
- [useIconUrl](#useiconurl)
- [useAttachmentUrl](#useattachmenturl)
- [useDocumentCreatedBy](#usedocumentcreatedby)
- [useOwnRoleInProject](#useownroleinproject)
- [useAddServerPeer](#useaddserverpeer)
- [useRemoveServerPeer](#useremoveserverpeer)
- [useCreateProject](#usecreateproject)
- [useLeaveProject](#useleaveproject)
- [useImportProjectConfig](#useimportprojectconfig)
- [useUpdateProjectSettings](#useupdateprojectsettings)
- [useCreateBlob](#usecreateblob)
- [useSyncState](#usesyncstate)
- [useDataSyncProgress](#usedatasyncprogress)
- [useStartSync](#usestartsync)
- [useStopSync](#usestopsync)
- [useSingleDocByDocId](#usesingledocbydocid)
- [useSingleDocByVersionId](#usesingledocbyversionid)
- [useManyDocs](#usemanydocs)
- [useCreateDocument](#usecreatedocument)
- [useUpdateDocument](#useupdatedocument)
- [useDeleteDocument](#usedeletedocument)
- [useSetUpInvitesListeners](#usesetupinviteslisteners)
- [useManyInvites](#usemanyinvites)
- [useSingleInvite](#usesingleinvite)
- [useAcceptInvite](#useacceptinvite)
- [useRejectInvite](#userejectinvite)
- [useSendInvite](#usesendinvite)
- [useRequestCancelInvite](#userequestcancelinvite)
- [useMapStyleUrl](#usemapstyleurl)

### ClientApiProvider

Create a context provider that holds a CoMapeo API client instance.

| Function | Type |
| ---------- | ---------- |
| `ClientApiProvider` | `({ children, clientApi, }: { children: ReactNode; clientApi: MapeoClientApi; }) => Element` |

Parameters:

* `opts.children`: React children node
* `opts.clientApi`: Client API instance


### useClientApi

Access a client API instance. If a ClientApiContext provider is not
set up, it will throw an error.

| Function | Type |
| ---------- | ---------- |
| `useClientApi` | `() => MapeoClientApi` |

Examples:

```tsx
function ClientExample() {
  return (
    // Creation of clientApi omitted for brevity
    <ClientApiContext.Provider clientApi={clientApi}>
      <ComponentThatUsesClient />
    </ClientApiContext.Provider>
  )
}

function ComponentThatUsesClient() {
  const clientApi = useClientApi()

  // Rest omitted for brevity.
}
```


### useOwnDeviceInfo

Retrieve info about the current device.

| Function | Type |
| ---------- | ---------- |
| `useOwnDeviceInfo` | `() => { data: { deviceId: string; deviceType: "UNRECOGNIZED" or "device_type_unspecified" or "mobile" or "tablet" or "desktop" or "selfHostedServer"; } and Partial<DeviceInfoParam>; error: Error or null; isRefetching: boolean; }` |

Examples:

```tsx
function DeviceInfoExample() {
  const { data } = useDeviceInfo()
}
```


### useIsArchiveDevice

Retrieve whether the current device is an archive device or not.

| Function | Type |
| ---------- | ---------- |
| `useIsArchiveDevice` | `() => { data: boolean; error: Error or null; isRefetching: boolean; }` |

Examples:

```tsx
function IsArchiveDeviceExample() {
  const { data } = useIsArchiveDevice()
}
```


### useSetOwnDeviceInfo

Update the device info for the current device.

| Function | Type |
| ---------- | ---------- |
| `useSetOwnDeviceInfo` | `() => { error: Error; mutate: UseMutateFunction<void, Error, { name: string; deviceType: "UNRECOGNIZED" or "device_type_unspecified" or "mobile" or "tablet" or "desktop" or "selfHostedServer"; }, unknown>; mutateAsync: UseMutateAsyncFunction<...>; reset: () => void; status: "error"; } or { ...; }` |

### useSetIsArchiveDevice

Set or unset the current device as an archive device.

| Function | Type |
| ---------- | ---------- |
| `useSetIsArchiveDevice` | `() => { error: Error; mutate: UseMutateFunction<void, Error, { isArchiveDevice: boolean; }, unknown>; mutateAsync: UseMutateAsyncFunction<void, Error, { isArchiveDevice: boolean; }, unknown>; reset: () => void; status: "error"; } or { ...; }` |

### useProjectSettings

Retrieve the project settings for a project.

| Function | Type |
| ---------- | ---------- |
| `useProjectSettings` | `({ projectId }: { projectId: string; }) => { data: EditableProjectSettings; error: Error or null; isRefetching: boolean; }` |

Parameters:

* `opts.projectId`: Project public ID


Examples:

```tsx
function BasicExample() {
  const { data } = useProjectSettings({ projectId: '...' })

  console.log(data.name)
}
```


### useSingleProject

Retrieve a project API instance for a project.

This is mostly used internally by the other hooks and should only be used if certain project APIs are not exposed via the hooks.

| Function | Type |
| ---------- | ---------- |
| `useSingleProject` | `({ projectId }: { projectId: string; }) => { data: ClientApi<MapeoProject>; error: Error or null; isRefetching: boolean; }` |

Parameters:

* `opts.projectId`: Project public ID


Examples:

```tsx
function BasicExample() {
  const { data } = useSingleProject({ projectId: '...' })
}
```


### useManyProjects

Retrieve project information for each project that exists.

| Function | Type |
| ---------- | ---------- |
| `useManyProjects` | `() => { data: (Pick<{ schemaName: "projectSettings"; name?: string or undefined; defaultPresets?: { point: string[]; area: string[]; vertex: string[]; line: string[]; relation: string[]; } or undefined; configMetadata?: { ...; } or undefined; }, "name"> and { ...; })[]; error: Error or null; isRefetching: boolean; }` |

Examples:

```tsx
function BasicExample() {
  const { data } = useManyProjects()

  console.log(data.map(project => project.name))
}
```


### useSingleMember

Retrieve a single member of a project.

| Function | Type |
| ---------- | ---------- |
| `useSingleMember` | `({ projectId, deviceId, }: { projectId: string; deviceId: string; }) => { data: MemberInfo; error: Error or null; isRefetching: boolean; }` |

Parameters:

* `opts.projectId`: Project public ID
* `opts.projectId`: Device ID of interest


Examples:

```tsx
function BasicExample() {
  const { data } = useSingleMember({ projectId: '...', deviceId: '...' })

  console.log(data.role)
}
```


### useManyMembers

Retrieve all members of a project.

| Function | Type |
| ---------- | ---------- |
| `useManyMembers` | `({ projectId }: { projectId: string; }) => { data: MemberInfo[]; error: Error or null; isRefetching: boolean; }` |

Parameters:

* `opts.projectId`: Project public ID


Examples:

```tsx
function BasicExample() {
  const { data } = useManyMembers({ projectId: '...' })

  console.log(data.role)
}
```


### useIconUrl

Retrieve a URL that points to icon resources served by the embedded HTTP server.

_TODO: Explain bitmap opts vs svg opts_

| Function | Type |
| ---------- | ---------- |
| `useIconUrl` | `({ projectId, iconId, ...mimeBasedOpts }: { projectId: string; iconId: string; } and (BitmapOpts or SvgOpts)) => { data: string; error: Error or null; isRefetching: boolean; }` |

Parameters:

* `opts.projectId`: Project public ID
* `opts.iconId`: Icon ID of interest
* `opts.mimeType`: MIME type of desired resource
* `opts.pixelDensity`: Pixel density resource (only applicable when `mimeType` is `'image/png'`)
* `opts.size`: Size of desired resource


Examples:

```tsx
function PngExample() {
  const { data } = useIconUrl({
    projectId: '...',
    iconId: '...',
    mimeType: 'image/png',
    pixelDensity: 1,
    size: 'medium'
  })
}
```

```tsx
function SvgExample() {
  const { data } = useIconUrl({
    projectId: '...',
    iconId: '...',
    mimeType: 'image/svg',
    size: 'medium'
  })
}
```


### useAttachmentUrl

Retrieve a URL that points to a desired blob resource.

_TODO: Explain BlobId in more depth_

| Function | Type |
| ---------- | ---------- |
| `useAttachmentUrl` | `({ projectId, blobId, }: { projectId: string; blobId: BlobId; }) => { data: string; error: Error or null; isRefetching: boolean; }` |

Parameters:

* `opts.projectId`: Project public Id
* `opts.blobId`: Blob ID of the desired resource


Examples:

```tsx
function PhotoExample() {
  const { data } = useAttachmentUrl({
    projectId: '...',
    blobId: {
      type: 'photo',
      variant: 'thumbnail',
      name: '...',
      driveId: '...',
    }
  })
}
```

```tsx
function AudioExample() {
  const { data } = useAttachmentUrl({
    projectId: '...',
    blobId: {
      type: 'audio',
      variant: 'original',
      name: '...',
      driveId: '...',
    }
  })
}
```

```tsx
function VideoExample() {
  const { data } = useAttachmentUrl({
    projectId: '...',
    blobId: {
      type: 'video',
      variant: 'original',
      name: '...',
      driveId: '...',
    }
  })
}
```


### useDocumentCreatedBy

Retrieve the device ID that created a document.

| Function | Type |
| ---------- | ---------- |
| `useDocumentCreatedBy` | `({ projectId, originalVersionId, }: { projectId: string; originalVersionId: string; }) => { data: string; error: Error or null; isRefetching: boolean; }` |

Parameters:

* `opts.projectId`: Project public ID
* `opts.originalVersionId`: Version ID of document


Examples:

```tsx
function BasicExample() {
  const { data } = useDocumentCreatedBy({
    projectId: '...',
    originalVersionId: '...',
  })
}
```


### useOwnRoleInProject

Get the role for the current device in a specified project.
This is a more convenient alternative to using the `useOwnDeviceInfo` and `useManyMembers` hooks.

| Function | Type |
| ---------- | ---------- |
| `useOwnRoleInProject` | `({ projectId }: { projectId: string; }) => { data: Role<"a12a6702b93bd7ff" or "f7c150f5a3a9a855" or "012fd2d431c0bf60" or "9e6d29263cba36c9" or "8ced989b1904606b" or "a24eaca65ab5d5d0" or "08e4251e36f6e7ed">; error: Error or null; isRefetching: boolean; }` |

Parameters:

* `opts.projectId`: Project public ID


Examples:

```tsx
function BasicExample() {
  const { data } = useOwnRoleInProject({
    projectId: '...',
  })
}
```


### useAddServerPeer

| Function | Type |
| ---------- | ---------- |
| `useAddServerPeer` | `({ projectId }: { projectId: string; }) => { error: Error; mutate: UseMutateFunction<void, Error, { baseUrl: string; dangerouslyAllowInsecureConnections?: boolean or undefined; }, unknown>; mutateAsync: UseMutateAsyncFunction<...>; reset: () => void; status: "error"; } or { ...; }` |

### useRemoveServerPeer

| Function | Type |
| ---------- | ---------- |
| `useRemoveServerPeer` | `({ projectId }: { projectId: string; }) => { error: Error; mutate: UseMutateFunction<void, Error, { serverDeviceId: string; dangerouslyAllowInsecureConnections?: boolean or undefined; }, unknown>; mutateAsync: UseMutateAsyncFunction<...>; reset: () => void; status: "error"; } or { ...; }` |

### useCreateProject

Create a new project.

| Function | Type |
| ---------- | ---------- |
| `useCreateProject` | `() => { error: Error; mutate: UseMutateFunction<string, Error, { name?: string or undefined; configPath?: string or undefined; } or undefined, unknown>; mutateAsync: UseMutateAsyncFunction<...>; reset: () => void; status: "error"; } or { ...; }` |

### useLeaveProject

Leave an existing project.

| Function | Type |
| ---------- | ---------- |
| `useLeaveProject` | `() => { error: Error; mutate: UseMutateFunction<void, Error, { projectId: string; }, unknown>; mutateAsync: UseMutateAsyncFunction<void, Error, { projectId: string; }, unknown>; reset: () => void; status: "error"; } or { ...; }` |

### useImportProjectConfig

Update the configuration of a project using an external file.

| Function | Type |
| ---------- | ---------- |
| `useImportProjectConfig` | `({ projectId }: { projectId: string; }) => { error: Error; mutate: UseMutateFunction<Error[], Error, { configPath: string; }, unknown>; mutateAsync: UseMutateAsyncFunction<Error[], Error, { ...; }, unknown>; reset: () => void; status: "error"; } or { ...; }` |

Parameters:

* `opts.projectId`: Public ID of the project to apply changes to.


### useUpdateProjectSettings

Update the settings of a project.

| Function | Type |
| ---------- | ---------- |
| `useUpdateProjectSettings` | `({ projectId }: { projectId: string; }) => { error: Error; mutate: UseMutateFunction<EditableProjectSettings, Error, { name?: string or undefined; configMetadata?: { ...; } or undefined; defaultPresets?: { ...; } or undefined; }, unknown>; mutateAsync: UseMutateAsyncFunction<...>; reset: () => void; status: "error"; } ...` |

Parameters:

* `opts.projectId`: Public ID of the project to apply changes to.


### useCreateBlob

Create a blob for a project.

| Function | Type |
| ---------- | ---------- |
| `useCreateBlob` | `({ projectId }: { projectId: string; }) => { error: Error; mutate: UseMutateFunction<{ driveId: string; name: string; type: "photo" or "audio" or "video"; hash: string; }, Error, { original: string; preview?: string or undefined; thumbnail?: string or undefined; metadata: Metadata; }, unknown>; mutateAsync: UseMutateAsy...` |

Parameters:

* `opts.projectId`: Public project ID of project to apply to changes to.


### useSyncState

Hook to subscribe to the current sync state.

Creates a global singleton for each project, to minimize traffic over IPC -
this hook can safely be used in more than one place without attaching
additional listeners across the IPC channel.

| Function | Type |
| ---------- | ---------- |
| `useSyncState` | `({ projectId, }: { projectId: string; }) => State or null` |

Parameters:

* `opts.projectId`: Project public ID


Examples:

```ts
function Example() {
    const syncState = useSyncState({ projectId });

    if (!syncState) {
        // Sync information hasn't been loaded yet
    }

    // Actual info about sync state is available...
}
```


### useDataSyncProgress

Provides the progress of data sync for sync-enabled connected peers

| Function | Type |
| ---------- | ---------- |
| `useDataSyncProgress` | `({ projectId, }: { projectId: string; }) => number or null` |

### useStartSync

| Function | Type |
| ---------- | ---------- |
| `useStartSync` | `({ projectId }: { projectId: string; }) => { error: Error; mutate: UseMutateFunction<void, Error, { autostopDataSyncAfter: number or null; } or undefined, unknown>; mutateAsync: UseMutateAsyncFunction<...>; reset: () => void; status: "error"; } or { ...; }` |

### useStopSync

| Function | Type |
| ---------- | ---------- |
| `useStopSync` | `({ projectId }: { projectId: string; }) => { error: Error; mutate: UseMutateFunction<void, Error, void, unknown>; mutateAsync: UseMutateAsyncFunction<void, Error, void, unknown>; reset: () => void; status: "error"; } or { ...; }` |

### useSingleDocByDocId

Retrieve a single document from the database based on the document's document ID.

Triggers the closest error boundary if the document cannot be found

| Function | Type |
| ---------- | ---------- |
| `useSingleDocByDocId` | `<D extends WriteableDocumentType>({ projectId, docType, docId, lang, }: { projectId: string; docType: D; docId: string; lang?: string or undefined; }) => ReadHookResult<Extract<{ schemaName: "deviceInfo"; name: string; deviceType: "UNRECOGNIZED" or ... 4 more ... or "selfHostedServer"; ... 7 more ...; deleted: boolean;...` |

Parameters:

* `opts.projectId`: Project public ID
* `opts.docType`: Document type of interest
* `opts.docId`: Document ID
* `opts.lang`: Language to translate the document into


Examples:

```tsx
function SingleDocumentByDocIdExample() {
  const { data } = useSingleDocByDocId({
    projectId: '...',
    docType: 'observation',
    docId: '...',
  })

  console.log(data.schemaName) // logs 'observation'
}
```


### useSingleDocByVersionId

Retrieve a single document from the database based on the document's version ID.

Triggers the closest error boundary if the document cannot be found.

| Function | Type |
| ---------- | ---------- |
| `useSingleDocByVersionId` | `<D extends WriteableDocumentType>({ projectId, docType, versionId, lang, }: { projectId: string; docType: D; versionId: string; lang?: string or undefined; }) => ReadHookResult<Extract<{ schemaName: "deviceInfo"; name: string; deviceType: "UNRECOGNIZED" or ... 4 more ... or "selfHostedServer"; ... 7 more ...; deleted: ...` |

Parameters:

* `opts.projectId`: Project public ID
* `opts.docType`: Document type of interest
* `opts.versionId`: Document's version ID
* `opts.lang`: Language to translate the document into

*


Examples:

```tsx
function SingleDocumentByVersionIdExample() {
  const { data } = useSingleDocByVersionId({
    projectId: '...',
    docType: 'observation',
    docId: '...',
  })

  console.log(data.schemaName) // logs 'observation'
}
```


### useManyDocs

Retrieve all documents of a specific `docType`.

| Function | Type |
| ---------- | ---------- |
| `useManyDocs` | `<D extends WriteableDocumentType>({ projectId, docType, includeDeleted, lang, }: { projectId: string; docType: D; includeDeleted?: boolean or undefined; lang?: string or undefined; }) => ReadHookResult<(Extract<{ schemaName: "deviceInfo"; name: string; deviceType: "UNRECOGNIZED" or ... 4 more ... or "selfHostedServer"; ...` |

Parameters:

* `opts.projectId`: Project public ID
* `opts.docType`: Document type of interest
* `opts.includeDeleted`: Include documents that have been marked as deleted
* `opts.lang`: Language to translate the documents into


Examples:

```tsx
function BasicExample() {
  const { data } = useManyDocs({
    projectId: '...',
    docType: 'observations',
  })
}
```

```tsx
function useAllObservations(opts) {
  return useManyDocs({
    ...opts,
    docType: 'observations',
  })
}

function useAllPresets(opts) {
  return useManyDocs({
    ...opts,
    docType: 'presets',
  })
}
```


### useCreateDocument

Create a document for a project.

| Function | Type |
| ---------- | ---------- |
| `useCreateDocument` | `<D extends WriteableDocumentType>({ docType, projectId, }: { docType: D; projectId: string; }) => { error: Error; mutate: UseMutateFunction<WriteableDocument<D> and { forks: string[]; }, Error, { ...; }, unknown>; mutateAsync: UseMutateAsyncFunction<...>; reset: () => void; status: "error"; } or { ...; }` |

Parameters:

* `opts.docType`: Document type to create.
* `opts.projectId`: Public ID of project to create document for.


### useUpdateDocument

Update a document within a project.

| Function | Type |
| ---------- | ---------- |
| `useUpdateDocument` | `<D extends WriteableDocumentType>({ docType, projectId, }: { docType: D; projectId: string; }) => { error: Error; mutate: UseMutateFunction<WriteableDocument<D> and { forks: string[]; }, Error, { ...; }, unknown>; mutateAsync: UseMutateAsyncFunction<...>; reset: () => void; status: "error"; } or { ...; }` |

Parameters:

* `opts.docType`: Document type to update.
* `opts.projectId`: Public ID of project document belongs to.


### useDeleteDocument

Delete a document within a project.

| Function | Type |
| ---------- | ---------- |
| `useDeleteDocument` | `<D extends WriteableDocumentType>({ docType, projectId, }: { docType: D; projectId: string; }) => { error: Error; mutate: UseMutateFunction<WriteableDocument<D> and { forks: string[]; }, Error, { ...; }, unknown>; mutateAsync: UseMutateAsyncFunction<...>; reset: () => void; status: "error"; } or { ...; }` |

Parameters:

* `opts.docType`: Document type to delete.
* `opts.projectId`: Public ID of project document belongs to.


### useSetUpInvitesListeners

Set up listeners for received and updated invites.
It is necessary to use this if you want the invites-related read hooks to update
based on invites that are received or changed in the background.

| Function | Type |
| ---------- | ---------- |
| `useSetUpInvitesListeners` | `() => void` |

Examples:

```tsx
function App() {
  // Use this somewhere near the root of the application
  useSetUpInvitesListeners()

  return <RestOfApp />
}
```


### useManyInvites

Get all invites that the device has received.

| Function | Type |
| ---------- | ---------- |
| `useManyInvites` | `() => { data: Invite[]; error: Error or null; isRefetching: boolean; }` |

Examples:

```ts
function Example() {
  const { data } = useManyInvites()
}
```


### useSingleInvite

Get a single invite based on its ID.

| Function | Type |
| ---------- | ---------- |
| `useSingleInvite` | `({ inviteId }: { inviteId: string; }) => { data: Invite; error: Error or null; isRefetching: boolean; }` |

Parameters:

* `opts.inviteId`: ID of invite


Examples:

```ts
function Example() {
  const { data } = useSingleInvite({ inviteId: '...' })
}
```


### useAcceptInvite

Accept an invite that has been received.

| Function | Type |
| ---------- | ---------- |
| `useAcceptInvite` | `() => { error: Error; mutate: UseMutateFunction<string, Error, { inviteId: string; }, unknown>; mutateAsync: UseMutateAsyncFunction<string, Error, { inviteId: string; }, unknown>; reset: () => void; status: "error"; } or { ...; }` |

### useRejectInvite

Reject an invite that has been received.

| Function | Type |
| ---------- | ---------- |
| `useRejectInvite` | `() => { error: Error; mutate: UseMutateFunction<void, Error, { inviteId: string; }, unknown>; mutateAsync: UseMutateAsyncFunction<void, Error, { inviteId: string; }, unknown>; reset: () => void; status: "error"; } or { ...; }` |

### useSendInvite

Send an invite for a project.

| Function | Type |
| ---------- | ---------- |
| `useSendInvite` | `({ projectId }: { projectId: string; }) => { error: Error; mutate: UseMutateFunction<"ACCEPT" or "REJECT" or "ALREADY", Error, { deviceId: string; roleDescription?: string or undefined; roleId: "f7c150f5a3a9a855" or "012fd2d431c0bf60" or "9e6d29263cba36c9"; roleName?: string or undefined; }, unknown>; mutateAsync: UseMuta...` |

Parameters:

* `opts.projectId`: Public ID of project to send the invite on behalf of.


### useRequestCancelInvite

Request a cancellation of an invite sent to another device.

| Function | Type |
| ---------- | ---------- |
| `useRequestCancelInvite` | `({ projectId }: { projectId: string; }) => { error: Error; mutate: UseMutateFunction<void, Error, { deviceId: string; }, unknown>; mutateAsync: UseMutateAsyncFunction<void, Error, { ...; }, unknown>; reset: () => void; status: "error"; } or { ...; }` |

Parameters:

* `opts.projectId`: Public ID of project to request the invite cancellation for.


### useMapStyleUrl

Get a URL that points to a StyleJSON resource served by the embedded HTTP server.

If `opts.refreshToken` is specified, it will be appended to the returned URL as a search param. This is useful for forcing cache busting
due to hidden internal details by consuming components (e.g. map component from MapLibre).

| Function | Type |
| ---------- | ---------- |
| `useMapStyleUrl` | `({ refreshToken, }?: { refreshToken?: string or undefined; }) => { data: string; error: Error or null; isRefetching: boolean; }` |

Parameters:

* `opts.refreshToken`: String to append to the returned value as a search param


Examples:

```tsx
function ExampleWithoutRefreshToken() {
  const { data, isRefetching } = useMapStyleUrl()

  console.log(data) // logs something like 'http://localhost:...'
}
```

```tsx
function ExampleWithRefreshToken() {
  const [refreshToken] = useState('foo')
  const { data } = useMapStyleUrl({ refreshToken })

  console.log(data) // logs something like 'http://localhost:...?refresh_token=foo'
}
```



## Constants

- [ClientApiContext](#clientapicontext)

### ClientApiContext

| Constant | Type |
| ---------- | ---------- |
| `ClientApiContext` | `Context<MapeoClientApi or null>` |



## Types

- [WriteableDocumentType](#writeabledocumenttype)
- [WriteableValue](#writeablevalue)
- [WriteableDocument](#writeabledocument)

### WriteableDocumentType

| Type | Type |
| ---------- | ---------- |
| `WriteableDocumentType` | `Extract< MapeoDoc['schemaName'], 'field' or 'observation' or 'preset' or 'track' or 'remoteDetectionAlert' >` |

### WriteableValue

| Type | Type |
| ---------- | ---------- |
| `WriteableValue` | `Extract< MapeoValue, { schemaName: D } >` |

### WriteableDocument

| Type | Type |
| ---------- | ---------- |
| `WriteableDocument` | `Extract< MapeoDoc, { schemaName: D } >` |


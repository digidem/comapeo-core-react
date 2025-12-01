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
- [useOwnRoleInProject](#useownroleinproject)
- [useAddServerPeer](#useaddserverpeer)
- [useRemoveServerPeer](#useremoveserverpeer)
- [useCreateProject](#usecreateproject)
- [useLeaveProject](#useleaveproject)
- [useImportProjectCategories](#useimportprojectcategories)
- [useImportProjectConfig](#useimportprojectconfig)
- [useUpdateProjectSettings](#useupdateprojectsettings)
- [useChangeMemberRole](#usechangememberrole)
- [useRemoveMember](#useremovemember)
- [useProjectOwnRoleChangeListener](#useprojectownrolechangelistener)
- [useCreateBlob](#usecreateblob)
- [useSyncState](#usesyncstate)
- [useDataSyncProgress](#usedatasyncprogress)
- [useStartSync](#usestartsync)
- [useStopSync](#usestopsync)
- [useConnectSyncServers](#useconnectsyncservers)
- [useDisconnectSyncServers](#usedisconnectsyncservers)
- [useSetAutostopDataSyncTimeout](#usesetautostopdatasynctimeout)
- [useExportGeoJSON](#useexportgeojson)
- [useExportZipFile](#useexportzipfile)
- [useSingleDocByDocId](#usesingledocbydocid)
- [useSingleDocByVersionId](#usesingledocbyversionid)
- [useManyDocs](#usemanydocs)
- [useCreateDoc](#usecreatedoc)
- [useUpdateDoc](#useupdatedoc)
- [useDeleteDoc](#usedeletedoc)
- [usePresetsSelection](#usepresetsselection)
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
| `ClientApiProvider` | `({ children, clientApi, }: { children: ReactNode; clientApi: any; }) => Element` |

Parameters:

* `opts.children`: React children node
* `opts.clientApi`: Client API instance


### useClientApi

Access a client API instance. If a ClientApiContext provider is not
set up, it will throw an error.

| Function | Type |
| ---------- | ---------- |
| `useClientApi` | `() => any` |

Returns:

Client API instance

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
| `useOwnDeviceInfo` | `() => { data: any; error: Error or null; isRefetching: boolean; }` |

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
| `useIsArchiveDevice` | `() => { data: any; error: Error or null; isRefetching: boolean; }` |

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
| `useSetOwnDeviceInfo` | `() => { error: Error; mutate: UseMutateFunction<any, Error, { name: string; deviceType: "device_type_unspecified" or "mobile" or "tablet" or "desktop" or "selfHostedServer" or "UNRECOGNIZED"; }, unknown>; mutateAsync: UseMutateAsyncFunction<...>; reset: () => void; status: "error"; } or { ...; }` |

### useSetIsArchiveDevice

Set or unset the current device as an archive device.

| Function | Type |
| ---------- | ---------- |
| `useSetIsArchiveDevice` | `() => { error: Error; mutate: UseMutateFunction<any, Error, { isArchiveDevice: boolean; }, unknown>; mutateAsync: UseMutateAsyncFunction<any, Error, { isArchiveDevice: boolean; }, unknown>; reset: () => void; status: "error"; } or { ...; }` |

### useProjectSettings

Retrieve the project settings for a project.

| Function | Type |
| ---------- | ---------- |
| `useProjectSettings` | `({ projectId }: { projectId: string; }) => { data: any; error: Error or null; isRefetching: boolean; }` |

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
| `useSingleProject` | `({ projectId }: { projectId: string; }) => { data: any; error: Error or null; isRefetching: boolean; }` |

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
| `useManyProjects` | `() => { data: any; error: Error or null; isRefetching: boolean; }` |

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
| `useSingleMember` | `({ projectId, deviceId, }: { projectId: string; deviceId: string; }) => { data: any; error: Error or null; isRefetching: boolean; }` |

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
| `useManyMembers` | `({ projectId }: { projectId: string; }) => { data: any; error: Error or null; isRefetching: boolean; }` |

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


### useOwnRoleInProject

Get the role for the current device in a specified project.
This is a more convenient alternative to using the `useOwnDeviceInfo` and `useManyMembers` hooks.

| Function | Type |
| ---------- | ---------- |
| `useOwnRoleInProject` | `({ projectId }: { projectId: string; }) => { data: any; error: Error or null; isRefetching: boolean; }` |

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
| `useAddServerPeer` | `({ projectId }: { projectId: string; }) => { error: Error; mutate: UseMutateFunction<any, Error, { baseUrl: string; dangerouslyAllowInsecureConnections?: boolean or undefined; }, unknown>; mutateAsync: UseMutateAsyncFunction<...>; reset: () => void; status: "error"; } or { ...; }` |

### useRemoveServerPeer

| Function | Type |
| ---------- | ---------- |
| `useRemoveServerPeer` | `({ projectId }: { projectId: string; }) => { error: Error; mutate: UseMutateFunction<any, Error, { serverDeviceId: string; dangerouslyAllowInsecureConnections?: boolean or undefined; }, unknown>; mutateAsync: UseMutateAsyncFunction<...>; reset: () => void; status: "error"; } or { ...; }` |

### useCreateProject

Create a new project.

| Function | Type |
| ---------- | ---------- |
| `useCreateProject` | `() => { error: Error; mutate: UseMutateFunction<any, Error, { name?: string or undefined; configPath?: string or undefined; } or undefined, unknown>; mutateAsync: UseMutateAsyncFunction<...>; reset: () => void; status: "error"; } or { ...; }` |

### useLeaveProject

Leave an existing project.

| Function | Type |
| ---------- | ---------- |
| `useLeaveProject` | `() => { error: Error; mutate: UseMutateFunction<any, Error, { projectId: string; }, unknown>; mutateAsync: UseMutateAsyncFunction<any, Error, { projectId: string; }, unknown>; reset: () => void; status: "error"; } or { ...; }` |

### useImportProjectCategories

Update the categories of a project using an external file.

| Function | Type |
| ---------- | ---------- |
| `useImportProjectCategories` | `({ projectId, }: { projectId: string; }) => { error: Error; mutate: UseMutateFunction<unknown, Error, { filePath: string; }, unknown>; mutateAsync: UseMutateAsyncFunction<unknown, Error, { filePath: string; }, unknown>; reset: () => void; status: "error"; } or { ...; }` |

Parameters:

* `opts.projectId`: Public ID of the project to apply changes to.


### useImportProjectConfig

Update the configuration of a project using an external file.

| Function | Type |
| ---------- | ---------- |
| `useImportProjectConfig` | `({ projectId }: { projectId: string; }) => { error: Error; mutate: UseMutateFunction<unknown, Error, { configPath: string; }, unknown>; mutateAsync: UseMutateAsyncFunction<unknown, Error, { configPath: string; }, unknown>; reset: () => void; status: "error"; } or { ...; }` |

Parameters:

* `opts.projectId`: Public ID of the project to apply changes to.


### useUpdateProjectSettings

Update the settings of a project.

| Function | Type |
| ---------- | ---------- |
| `useUpdateProjectSettings` | `({ projectId }: { projectId: string; }) => { error: Error; mutate: UseMutateFunction<any, Error, Partial<EditableProjectSettings>, unknown>; mutateAsync: UseMutateAsyncFunction<...>; reset: () => void; status: "error"; } or { ...; }` |

Parameters:

* `opts.projectId`: Public ID of the project to apply changes to.


### useChangeMemberRole

Change a project member's role.

| Function | Type |
| ---------- | ---------- |
| `useChangeMemberRole` | `({ projectId }: { projectId: string; }) => { error: Error; mutate: UseMutateFunction<any, Error, { deviceId: string; roleId: "f7c150f5a3a9a855" or "012fd2d431c0bf60" or "9e6d29263cba36c9"; }, unknown>; mutateAsync: UseMutateAsyncFunction<...>; reset: () => void; status: "error"; } or { ...; }` |

Parameters:

* `opts.projectId`: Project public ID


Examples:

```tsx
function BasicExample() {
  const { mutate } = useChangeMemberRole({ projectId: '...' })
  // Use one of: COORDINATOR_ROLE_ID, MEMBER_ROLE_ID, BLOCKED_ROLE_ID
  mutate({ deviceId: '...', roleId: COORDINATOR_ROLE_ID })
}
```


### useRemoveMember

Remove a member from a project, providing an optional reason for removal.

Do NOT use this for removing your own device from a project. Use `useLeaveProject` instead.

| Function | Type |
| ---------- | ---------- |
| `useRemoveMember` | `({ projectId }: { projectId: string; }) => { error: Error; mutate: UseMutateFunction<any, Error, { deviceId: string; reason?: string or undefined; }, unknown>; mutateAsync: UseMutateAsyncFunction<...>; reset: () => void; status: "error"; } or { ...; }` |

Parameters:

* `opts.projectId`: Project public ID


Examples:

```tsx
function BasicExample() {
  const { mutate } = useRemoveMember({ projectId: '...' })
  mutate({
    deviceId: '...',
    // Optional
    reason: '...',
  })
}
```


### useProjectOwnRoleChangeListener

Set up listener for changes to your own role in a project.
It is necessary to use this if you want the project role-related read hooks to update
based on role change events that are received in the background.

| Function | Type |
| ---------- | ---------- |
| `useProjectOwnRoleChangeListener` | `({ projectId, listener, }: { projectId: string; listener?: ((event: RoleChangeEvent) => void) or undefined; }) => void` |

Parameters:

* `opts.listener`: Optional listener to invoke when role changes


Examples:

```tsx
function SomeComponent({ projectId }: { projectId: string }) {
  useProjectOwnRoleChangeListener({ projectId })
}
```
```tsx
function ComponentWithListener({ projectId }: { projectId: string }) {
  useProjectOwnRoleChangeListener({
    projectId,
    listener: (event) => {
      // Handle role change, e.g., navigate to default project
      console.log('New role:', event.role)
    }
  })
}
```


### useCreateBlob

Create a blob for a project.

| Function | Type |
| ---------- | ---------- |
| `useCreateBlob` | `({ projectId }: { projectId: string; }) => { error: Error; mutate: UseMutateFunction<any, Error, { original: string; preview?: string or undefined; thumbnail?: string or undefined; metadata: Metadata; }, unknown>; mutateAsync: UseMutateAsyncFunction<...>; reset: () => void; status: "error"; } or { ...; }` |

Parameters:

* `opts.projectId`: Public project ID of project to apply to changes to.


### useSyncState

Hook to subscribe to the current sync state.

Creates a global singleton for each project, to minimize traffic over IPC -
this hook can safely be used in more than one place without attaching
additional listeners across the IPC channel.

| Function | Type |
| ---------- | ---------- |
| `useSyncState` | `({ projectId, }: { projectId: string; }) => any` |

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

Returns:

`null` if no sync state events have been received. Otherwise returns a value between 0 and 1 (inclusive)

### useStartSync

| Function | Type |
| ---------- | ---------- |
| `useStartSync` | `({ projectId }: { projectId: string; }) => { error: Error; mutate: UseMutateFunction<any, Error, { autostopDataSyncAfter: number or null; } or undefined, unknown>; mutateAsync: UseMutateAsyncFunction<...>; reset: () => void; status: "error"; } or { ...; }` |

### useStopSync

| Function | Type |
| ---------- | ---------- |
| `useStopSync` | `({ projectId }: { projectId: string; }) => { error: Error; mutate: UseMutateFunction<any, Error, void, unknown>; mutateAsync: UseMutateAsyncFunction<any, Error, void, unknown>; reset: () => void; status: "error"; } or { ...; }` |

### useConnectSyncServers

| Function | Type |
| ---------- | ---------- |
| `useConnectSyncServers` | `({ projectId }: { projectId: string; }) => { error: Error; mutate: UseMutateFunction<any, Error, void, unknown>; mutateAsync: UseMutateAsyncFunction<any, Error, void, unknown>; reset: () => void; status: "error"; } or { ...; }` |

### useDisconnectSyncServers

| Function | Type |
| ---------- | ---------- |
| `useDisconnectSyncServers` | `({ projectId }: { projectId: string; }) => { error: Error; mutate: UseMutateFunction<any, Error, void, unknown>; mutateAsync: UseMutateAsyncFunction<any, Error, void, unknown>; reset: () => void; status: "error"; } or { ...; }` |

### useSetAutostopDataSyncTimeout

| Function | Type |
| ---------- | ---------- |
| `useSetAutostopDataSyncTimeout` | `({ projectId, }: { projectId: string; }) => { error: Error; mutate: UseMutateFunction<any, Error, { after: number or null; }, unknown>; mutateAsync: UseMutateAsyncFunction<any, Error, { ...; }, unknown>; reset: () => void; status: "error"; } or { ...; }` |

### useExportGeoJSON

Creates a GeoJson file with all the observations and/or tracks in the project.

| Function | Type |
| ---------- | ---------- |
| `useExportGeoJSON` | `({ projectId }: { projectId: string; }) => { error: Error; mutate: UseMutateFunction<any, Error, { path: string; exportOptions: { observations?: boolean or undefined; tracks?: boolean or undefined; lang?: string or undefined; }; }, unknown>; mutateAsync: UseMutateAsyncFunction<...>; reset: () => void; status: "error"; ...` |

Parameters:

* `opts.projectId`: Public ID of the project to apply changes to.


### useExportZipFile

Creates a zip file containing a GeoJson file with all the observations and/or tracks in the project and all associated attachments (photos and audio).

| Function | Type |
| ---------- | ---------- |
| `useExportZipFile` | `({ projectId }: { projectId: string; }) => { error: Error; mutate: UseMutateFunction<any, Error, { path: string; exportOptions: { observations?: boolean or undefined; tracks?: boolean or undefined; lang?: string or undefined; attachments?: boolean or undefined; }; }, unknown>; mutateAsync: UseMutateAsyncFunction<...>; r...` |

Parameters:

* `opts.projectId`: Public ID of the project to apply changes to.


### useSingleDocByDocId

Retrieve a single document from the database based on the document's document ID.

Triggers the closest error boundary if the document cannot be found

| Function | Type |
| ---------- | ---------- |
| `useSingleDocByDocId` | `<D extends WriteableDocType>({ projectId, docType, docId, lang, }: { projectId: string; docType: D; docId: string; lang?: string or undefined; }) => { data: any; error: Error or null; isRefetching: boolean; }` |

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
| `useSingleDocByVersionId` | `<D extends WriteableDocType>({ projectId, docType, versionId, lang, }: { projectId: string; docType: D; versionId: string; lang?: string or undefined; }) => { data: any; error: Error or null; isRefetching: boolean; }` |

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
| `useManyDocs` | `<D extends WriteableDocType>({ projectId, docType, includeDeleted, lang, }: { projectId: string; docType: D; includeDeleted?: boolean or undefined; lang?: string or undefined; }) => { data: any; error: Error or null; isRefetching: boolean; }` |

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


### useCreateDoc

Create a document for a project.

| Function | Type |
| ---------- | ---------- |
| `useCreateDoc` | `<D extends WriteableDocType>({ docType, projectId, }: { docType: D; projectId: string; }) => { error: Error; mutate: UseMutateFunction<WriteableDoc<D> and DerivedDocFields, Error, { ...; }, unknown>; mutateAsync: UseMutateAsyncFunction<...>; reset: () => void; status: "error"; } or { ...; }` |

Parameters:

* `opts.docType`: Document type to create.
* `opts.projectId`: Public ID of project to create document for.


### useUpdateDoc

Update a document within a project.

| Function | Type |
| ---------- | ---------- |
| `useUpdateDoc` | `<D extends WriteableDocType>({ docType, projectId, }: { docType: D; projectId: string; }) => { error: Error; mutate: UseMutateFunction<WriteableDoc<D> and DerivedDocFields, Error, { ...; }, unknown>; mutateAsync: UseMutateAsyncFunction<...>; reset: () => void; status: "error"; } or { ...; }` |

Parameters:

* `opts.docType`: Document type to update.
* `opts.projectId`: Public ID of project document belongs to.


### useDeleteDoc

Delete a document within a project.

| Function | Type |
| ---------- | ---------- |
| `useDeleteDoc` | `<D extends WriteableDocType>({ docType, projectId, }: { docType: D; projectId: string; }) => { error: Error; mutate: UseMutateFunction<WriteableDoc<D> and DerivedDocFields, Error, { ...; }, unknown>; mutateAsync: UseMutateAsyncFunction<...>; reset: () => void; status: "error"; } or { ...; }` |

Parameters:

* `opts.docType`: Document type to delete.
* `opts.projectId`: Public ID of project document belongs to.


### usePresetsSelection

Retrieve presets for category selection, ordered by project settings.

Returns presets in the order defined by `projectSettings.defaultPresets` for the
specified data type. Falls back to alphabetical order (by preset name) if no defaults are configured.

| Function | Type |
| ---------- | ---------- |
| `usePresetsSelection` | `({ projectId, dataType, lang, }: { projectId: string; dataType: "track" or "observation"; lang?: string or undefined; }) => { schemaName: "preset"; name: string; geometry: ("point" or "vertex" or "line" or "area" or "relation")[]; ... 13 more ...; deleted: boolean; }[]` |

Parameters:

* `opts.projectId`: Project public ID
* `opts.dataType`: Type of data being created ('observation' or 'track')
* `opts.lang`: Language to translate presets into


Examples:

```tsx
function ObservationCategoryChooser() {
  const presets = usePresetsSelection({
    projectId: '...',
    dataType: 'observation',
  })
}
```

```tsx
function TrackCategoryChooser() {
  const presets = usePresetsSelection({
    projectId: '...',
    dataType: 'track',
  })
}
```


### useManyInvites

Get all invites that the device has received.

| Function | Type |
| ---------- | ---------- |
| `useManyInvites` | `() => { data: any; error: Error or null; isRefetching: boolean; }` |

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
| `useSingleInvite` | `({ inviteId }: { inviteId: string; }) => { data: any; error: Error or null; isRefetching: boolean; }` |

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
| `useAcceptInvite` | `() => { error: Error; mutate: UseMutateFunction<any, Error, { inviteId: string; }, unknown>; mutateAsync: UseMutateAsyncFunction<any, Error, { inviteId: string; }, unknown>; reset: () => void; status: "error"; } or { ...; }` |

### useRejectInvite

Reject an invite that has been received.

| Function | Type |
| ---------- | ---------- |
| `useRejectInvite` | `() => { error: Error; mutate: UseMutateFunction<any, Error, { inviteId: string; }, unknown>; mutateAsync: UseMutateAsyncFunction<any, Error, { inviteId: string; }, unknown>; reset: () => void; status: "error"; } or { ...; }` |

### useSendInvite

Send an invite for a project.

| Function | Type |
| ---------- | ---------- |
| `useSendInvite` | `({ projectId }: { projectId: string; }) => { error: Error; mutate: UseMutateFunction<any, Error, { deviceId: string; roleDescription?: string or undefined; roleId: "f7c150f5a3a9a855" or "012fd2d431c0bf60" or "9e6d29263cba36c9"; roleName?: string or undefined; }, unknown>; mutateAsync: UseMutateAsyncFunction<...>; reset:...` |

Parameters:

* `opts.projectId`: Public ID of project to send the invite on behalf of.


### useRequestCancelInvite

Request a cancellation of an invite sent to another device.

| Function | Type |
| ---------- | ---------- |
| `useRequestCancelInvite` | `({ projectId }: { projectId: string; }) => { error: Error; mutate: UseMutateFunction<any, Error, { deviceId: string; }, unknown>; mutateAsync: UseMutateAsyncFunction<any, Error, { ...; }, unknown>; reset: () => void; status: "error"; } or { ...; }` |

Parameters:

* `opts.projectId`: Public ID of project to request the invite cancellation for.


### useMapStyleUrl

Get a URL that points to a StyleJSON resource served by the embedded HTTP server.

If `opts.refreshToken` is specified, it will be appended to the returned URL as a search param. This is useful for forcing cache busting
due to hidden internal details by consuming components (e.g. map component from MapLibre).

| Function | Type |
| ---------- | ---------- |
| `useMapStyleUrl` | `({ refreshToken, }?: { refreshToken?: string or undefined; }) => { data: any; error: Error or null; isRefetching: boolean; }` |

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
| `ClientApiContext` | `Context<any>` |



## Types

- [WriteableDocType](#writeabledoctype)
- [WriteableValue](#writeablevalue)
- [WriteableDoc](#writeabledoc)

### WriteableDocType

| Type | Type |
| ---------- | ---------- |
| `WriteableDocType` | `Extract< ComapeoDoc['schemaName'], 'field' or 'observation' or 'preset' or 'track' or 'remoteDetectionAlert' >` |

### WriteableValue

| Type | Type |
| ---------- | ---------- |
| `WriteableValue` | `Extract< ComapeoValue, { schemaName: D } >` |

### WriteableDoc

| Type | Type |
| ---------- | ---------- |
| `WriteableDoc` | `Extract< ComapeoValue, { schemaName: D } >` |


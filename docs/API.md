## Functions

- [ClientApiProvider](#clientapiprovider)
- [useClientApi](#useclientapi)
- [useOwnDeviceInfo](#useowndeviceinfo)
- [useIsArchiveDevice](#useisarchivedevice)
- [useSetOwnDeviceInfo](#usesetowndeviceinfo)
- [useSetIsArchiveDevice](#usesetisarchivedevice)
- [ReceivedMapSharesProvider](#receivedmapsharesprovider)
- [SentMapSharesProvider](#sentmapsharesprovider)
- [useReceivedMapSharesActions](#usereceivedmapsharesactions)
- [useReceivedMapSharesState](#usereceivedmapsharesstate)
- [useReceivedMapSharesState](#usereceivedmapsharesstate)
- [useReceivedMapSharesState](#usereceivedmapsharesstate)
- [useSentMapSharesActions](#usesentmapsharesactions)
- [useSentMapSharesState](#usesentmapsharesstate)
- [createMapServerApi](#createmapserverapi)
- [MapServerProvider](#mapserverprovider)
- [useMapServerApi](#usemapserverapi)
- [ComapeoCoreProvider](#comapeocoreprovider)
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
- [useCreateDocument](#usecreatedocument)
- [useUpdateDocument](#useupdatedocument)
- [useDeleteDocument](#usedeletedocument)
- [usePresetsSelection](#usepresetsselection)
- [useManyInvites](#usemanyinvites)
- [useSingleInvite](#usesingleinvite)
- [useAcceptInvite](#useacceptinvite)
- [useRejectInvite](#userejectinvite)
- [useSendInvite](#usesendinvite)
- [useRequestCancelInvite](#userequestcancelinvite)
- [useMapStyleUrl](#usemapstyleurl)
- [useImportCustomMapFile](#useimportcustommapfile)
- [useRemoveCustomMapFile](#useremovecustommapfile)
- [useGetCustomMapInfo](#usegetcustommapinfo)
- [useManyReceivedMapShares](#usemanyreceivedmapshares)
- [useSingleReceivedMapShare](#usesinglereceivedmapshare)
- [useDownloadReceivedMapShare](#usedownloadreceivedmapshare)
- [useDeclineReceivedMapShare](#usedeclinereceivedmapshare)
- [useAbortReceivedMapShareDownload](#useabortreceivedmapsharedownload)
- [useSendMapShare](#usesendmapshare)
- [useCancelSentMapShare](#usecancelsentmapshare)
- [useSingleSentMapShare](#usesinglesentmapshare)

### ClientApiProvider

Create a context provider that holds a CoMapeo API client instance.

| Function | Type |
| ---------- | ---------- |
| `ClientApiProvider` | `({ children, clientApi, }: ClientApiProviderProps) => Element` |

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
| `useOwnDeviceInfo` | `() => Pick<UseSuspenseQueryResult<any>, "data" or "error" or "isRefetching">` |

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
| `useSetOwnDeviceInfo` | `() => Pick<Override<MutationObserverIdleResult<any, Error, { name: string; deviceType: DeviceInfo; }, unknown>, { mutate: UseMutateFunction<any, Error, { name: string; deviceType: DeviceInfo; }, unknown>; }> and { ...; }, "error" or ... 3 more ... or "mutateAsync"> or Pick<...> or Pick<...> or Pick<...>` |

### useSetIsArchiveDevice

Set or unset the current device as an archive device.

| Function | Type |
| ---------- | ---------- |
| `useSetIsArchiveDevice` | `() => Pick<Override<MutationObserverIdleResult<any, Error, { isArchiveDevice: boolean; }, unknown>, { mutate: UseMutateFunction<any, Error, { isArchiveDevice: boolean; }, unknown>; }> and { ...; }, "error" or ... 3 more ... or "mutateAsync"> or Pick<...> or Pick<...> or Pick<...>` |

### ReceivedMapSharesProvider

| Function | Type |
| ---------- | ---------- |
| `ReceivedMapSharesProvider` | `({ children, clientApi, mapServerApi, queryClient, }: { clientApi: any; mapServerApi: MapServerApi; } and { children?: ReactNode; } and { queryClient: QueryClient; }) => Element` |

### SentMapSharesProvider

| Function | Type |
| ---------- | ---------- |
| `SentMapSharesProvider` | `({ children, clientApi, mapServerApi, }: MapSharesProviderProps) => Element` |

### useReceivedMapSharesActions

| Function | Type |
| ---------- | ---------- |
| `useReceivedMapSharesActions` | `() => { download({ shareId }: DownloadMapShareOptions): Promise<void>; decline({ shareId, reason }: DeclineMapShareOptions): Promise<void>; abort({ shareId }: AbortMapShareOptions): Promise<...>; }` |

### useReceivedMapSharesState

| Function | Type |
| ---------- | ---------- |
| `useReceivedMapSharesState` | `{ (): any[]; <T>(selector: (state: any[]) => T): T; }` |

### useReceivedMapSharesState

| Function | Type |
| ---------- | ---------- |
| `useReceivedMapSharesState` | `{ (): any[]; <T>(selector: (state: any[]) => T): T; }` |

### useReceivedMapSharesState

| Function | Type |
| ---------- | ---------- |
| `useReceivedMapSharesState` | `{ (): any[]; <T>(selector: (state: any[]) => T): T; }` |

### useSentMapSharesActions

| Function | Type |
| ---------- | ---------- |
| `useSentMapSharesActions` | `() => { createAndSend({ receiverDeviceId, mapId, }: CreateAndSendMapShareOptions): Promise<ServerMapShareState>; cancel({ shareId }: CancelMapShareOptions): Promise<...>; }` |

### useSentMapSharesState

| Function | Type |
| ---------- | ---------- |
| `useSentMapSharesState` | `<T>(selector?: ((state: ServerMapShareState[]) => T) or undefined) => T` |

### createMapServerApi

Utility function to create a MapServerApi instance.
Only exported for unit testing purposes.

| Function | Type |
| ---------- | ---------- |
| `createMapServerApi` | `({ getBaseUrl, fetch, }: MapServerApiOptions) => MapServerApi` |

Parameters:

* `opts.getBaseUrl`: A function that returns a promise that resolves to the base URL of the map server.
* `opts.fetch`: An optional custom fetch function to use for making requests to the map server. If not provided, the global `fetch` will be used.


### MapServerProvider

Create a context provider that holds a `MapServerFetch` function, which waits
for the map server to be ready before making requests.

| Function | Type |
| ---------- | ---------- |
| `MapServerProvider` | `({ children, getBaseUrl, fetch, queryClient, }: MapServerProviderProps) => Element` |

Parameters:

* `opts.children`: React children node
* `opts.getBaseUrl`: A function that returns a promise that resolves to the base URL of the map server.
* `opts.fetch`: An optional custom fetch function to use for making requests to the map server. If not provided, the global `fetch` will be used.


Examples:

```tsx
import { createServer } from '@comapeo/map-server'

const server = createServer()
const listenPromise = server.listen()

const getBaseUrl = async () => {
  const { localPort } = await listenPromise
  return new URL(`http://localhost:${localPort}/`)
}

const mapServerApi = createMapServerApi({ getBaseUrl })

function App() {
  return (
    <MapServerProvider mapServerApi={mapServerApi}>
      <MyApp />
    </MapServerProvider>
  )
}
```


### useMapServerApi

Internal hook to get the MapServerApi (instance of ky) from context.
Throws if used outside of MapServerProvider.

| Function | Type |
| ---------- | ---------- |
| `useMapServerApi` | `() => MapServerApi` |

### ComapeoCoreProvider

| Function | Type |
| ---------- | ---------- |
| `ComapeoCoreProvider` | `({ children, clientApi, getMapServerBaseUrl, fetch, queryClient, }: ComapeoCoreProviderProps) => Element` |

### useProjectSettings

Retrieve the project settings for a project.

| Function | Type |
| ---------- | ---------- |
| `useProjectSettings` | `({ projectId, }: { projectId: string; }) => Pick<UseSuspenseQueryResult<any>, "data" or "error" or "isRefetching">` |

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
| `useSingleProject` | `({ projectId, }: { projectId: string; }) => Pick<UseSuspenseQueryResult<any>, "data" or "error" or "isRefetching">` |

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
| `useManyProjects` | `() => Pick<UseSuspenseQueryResult<any>, "data" or "error" or "isRefetching">` |

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
| `useSingleMember` | `({ projectId, deviceId, }: { projectId: string; deviceId: string; }) => Pick<UseSuspenseQueryResult<any>, "data" or "error" or "isRefetching">` |

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
| `useManyMembers` | `<T extends boolean>({ projectId, includeLeft, }: { projectId: string; includeLeft?: T or undefined; }) => Pick<UseSuspenseQueryResult<T extends true ? MemberInfo[] : ActiveMemberInfo[]>, "data" or ... 1 more ... or "isRefetching">` |

Parameters:

* `opts.projectId`: Project public ID


Examples:

```tsx
function BasicExample() {
  const activeMembers1 = useManyMembers({ projectId: '...' })
  const activeMembers2 = useManyMembers({ projectId: '...', includeLeft: false })

  const allMembers = useManyMembers({ projectId: '...', includeLeft: true })
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
| `useDocumentCreatedBy` | `({ projectId, originalVersionId, }: { projectId: string; originalVersionId: string; }) => { data: any; error: Error or null; isRefetching: boolean; }` |

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
| `useOwnRoleInProject` | `({ projectId, }: { projectId: string; }) => Pick<UseSuspenseQueryResult<any>, "data" or "error" or "isRefetching">` |

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
| `useAddServerPeer` | `({ projectId }: { projectId: string; }) => Pick<Override<MutationObserverIdleResult<any, Error, { baseUrl: string; dangerouslyAllowInsecureConnections?: boolean or undefined; }, unknown>, { ...; }> and { ...; }, "error" or ... 3 more ... or "mutateAsync"> or Pick<...> or Pick<...> or Pick<...>` |

### useRemoveServerPeer

| Function | Type |
| ---------- | ---------- |
| `useRemoveServerPeer` | `({ projectId }: { projectId: string; }) => Pick<Override<MutationObserverIdleResult<any, Error, { serverDeviceId: string; dangerouslyAllowInsecureConnections?: boolean or undefined; }, unknown>, { ...; }> and { ...; }, "error" or ... 3 more ... or "mutateAsync"> or Pick<...> or Pick<...> or Pick<...>` |

### useCreateProject

Create a new project.

| Function | Type |
| ---------- | ---------- |
| `useCreateProject` | `() => Pick<Override<MutationObserverIdleResult<any, Error, any, unknown>, { mutate: UseMutateFunction<any, Error, any, unknown>; }> and { ...; }, "error" or ... 3 more ... or "mutateAsync"> or Pick<...> or Pick<...> or Pick<...>` |

### useLeaveProject

Leave an existing project.

| Function | Type |
| ---------- | ---------- |
| `useLeaveProject` | `() => Pick<Override<MutationObserverIdleResult<any, Error, { projectId: string; }, unknown>, { mutate: UseMutateFunction<any, Error, { projectId: string; }, unknown>; }> and { ...; }, "error" or ... 3 more ... or "mutateAsync"> or Pick<...> or Pick<...> or Pick<...>` |

### useImportProjectCategories

Update the categories of a project using an external file.

| Function | Type |
| ---------- | ---------- |
| `useImportProjectCategories` | `({ projectId, }: { projectId: string; }) => Pick<Override<MutationObserverIdleResult<unknown, Error, { filePath: string; }, unknown>, { mutate: UseMutateFunction<unknown, Error, { filePath: string; }, unknown>; }> and { ...; }, "error" or ... 3 more ... or "mutateAsync"> or Pick<...> or Pick<...> or Pick<...>` |

Parameters:

* `opts.projectId`: Public ID of the project to apply changes to.


### useImportProjectConfig

Update the configuration of a project using an external file.

| Function | Type |
| ---------- | ---------- |
| `useImportProjectConfig` | `({ projectId }: { projectId: string; }) => Pick<Override<MutationObserverIdleResult<unknown, Error, { configPath: string; }, unknown>, { mutate: UseMutateFunction<unknown, Error, { configPath: string; }, unknown>; }> and { ...; }, "error" or ... 3 more ... or "mutateAsync"> or Pick<...> or Pick<...> or Pick<...>` |

Parameters:

* `opts.projectId`: Public ID of the project to apply changes to.


### useUpdateProjectSettings

Update the settings of a project.

| Function | Type |
| ---------- | ---------- |
| `useUpdateProjectSettings` | `({ projectId, }: { projectId: string; }) => FilteredMutationResult<UseMutationResult<EditableProjectSettings, Error, Partial<EditableProjectSettings>>>` |

Parameters:

* `opts.projectId`: Public ID of the project to apply changes to.


### useChangeMemberRole

Change a project member's role.

| Function | Type |
| ---------- | ---------- |
| `useChangeMemberRole` | `({ projectId }: { projectId: string; }) => Pick<Override<MutationObserverIdleResult<any, Error, { deviceId: string; roleId: "f7c150f5a3a9a855" or "012fd2d431c0bf60" or "9e6d29263cba36c9"; }, unknown>, { ...; }> and { ...; }, "error" or ... 3 more ... or "mutateAsync"> or Pick<...> or Pick<...> or Pick<...>` |

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
| `useRemoveMember` | `({ projectId }: { projectId: string; }) => Pick<Override<MutationObserverIdleResult<any, Error, { deviceId: string; reason?: string or undefined; }, unknown>, { mutate: UseMutateFunction<...>; }> and { ...; }, "error" or ... 3 more ... or "mutateAsync"> or Pick<...> or Pick<...> or Pick<...>` |

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
| `useProjectOwnRoleChangeListener` | `({ projectId, }: { projectId: string; }) => void` |

Examples:

```tsx
function ListenerComponent({ projectId }: { projectId: string }) {
  // Set up the listener
  useProjectOwnRoleChangeListener({ projectId })
}

// Handle role change events separately
function EventHandlerComponent() {
  const { data: projectApi } = useSingleProject({ projectId })

  useEffect(() => {
    function handleRoleChangeEvent(event) {
	     // Do something with event...
    }

    projectApi.addListener('own-role-change', handleRoleChangeEvent)

    return () => {
      projectApi.removeListener('own-role-change', handleRoleChangeEvent)
    }
  }, [projectApi])
}
```


### useCreateBlob

Create a blob for a project.

| Function | Type |
| ---------- | ---------- |
| `useCreateBlob` | `({ projectId }: { projectId: string; }) => Pick<Override<MutationObserverIdleResult<any, Error, { original: string; preview?: string or undefined; thumbnail?: string or undefined; metadata: Metadata; }, unknown>, { ...; }> and { ...; }, "error" or ... 3 more ... or "mutateAsync"> or Pick<...> or Pick<...> or Pick<...>` |

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
| `useStartSync` | `({ projectId }: { projectId: string; }) => Pick<Override<MutationObserverIdleResult<any, Error, { autostopDataSyncAfter: number or null; } or undefined, unknown>, { ...; }> and { ...; }, "error" or ... 3 more ... or "mutateAsync"> or Pick<...> or Pick<...> or Pick<...>` |

### useStopSync

| Function | Type |
| ---------- | ---------- |
| `useStopSync` | `({ projectId }: { projectId: string; }) => Pick<Override<MutationObserverIdleResult<any, Error, void, unknown>, { mutate: UseMutateFunction<any, Error, void, unknown>; }> and { ...; }, "error" or ... 3 more ... or "mutateAsync"> or Pick<...> or Pick<...> or Pick<...>` |

### useConnectSyncServers

| Function | Type |
| ---------- | ---------- |
| `useConnectSyncServers` | `({ projectId }: { projectId: string; }) => Pick<Override<MutationObserverIdleResult<any, Error, void, unknown>, { mutate: UseMutateFunction<any, Error, void, unknown>; }> and { ...; }, "error" or ... 3 more ... or "mutateAsync"> or Pick<...> or Pick<...> or Pick<...>` |

### useDisconnectSyncServers

| Function | Type |
| ---------- | ---------- |
| `useDisconnectSyncServers` | `({ projectId }: { projectId: string; }) => Pick<Override<MutationObserverIdleResult<any, Error, void, unknown>, { mutate: UseMutateFunction<any, Error, void, unknown>; }> and { ...; }, "error" or ... 3 more ... or "mutateAsync"> or Pick<...> or Pick<...> or Pick<...>` |

### useSetAutostopDataSyncTimeout

| Function | Type |
| ---------- | ---------- |
| `useSetAutostopDataSyncTimeout` | `({ projectId, }: { projectId: string; }) => Pick<Override<MutationObserverIdleResult<any, Error, { after: number or null; }, unknown>, { mutate: UseMutateFunction<any, Error, { ...; }, unknown>; }> and { ...; }, "error" or ... 3 more ... or "mutateAsync"> or Pick<...> or Pick<...> or Pick<...>` |

### useExportGeoJSON

Creates a GeoJson file with all the observations and/or tracks in the project.

| Function | Type |
| ---------- | ---------- |
| `useExportGeoJSON` | `({ projectId }: { projectId: string; }) => Pick<Override<MutationObserverIdleResult<any, Error, { path: string; exportOptions: { observations?: boolean or undefined; tracks?: boolean or undefined; lang?: string or undefined; }; }, unknown>, { ...; }> and { ...; }, "error" or ... 3 more ... or "mutateAsync"> or Pick<...> or P...` |

Parameters:

* `opts.projectId`: Public ID of the project to apply changes to.


### useExportZipFile

Creates a zip file containing a GeoJson file with all the observations and/or tracks in the project and all associated attachments (photos and audio).

| Function | Type |
| ---------- | ---------- |
| `useExportZipFile` | `({ projectId }: { projectId: string; }) => Pick<Override<MutationObserverIdleResult<any, Error, { path: string; exportOptions: { observations?: boolean or undefined; tracks?: boolean or undefined; lang?: string or undefined; attachments?: boolean or undefined; }; }, unknown>, { ...; }> and { ...; }, "error" or ... 3 more ....` |

Parameters:

* `opts.projectId`: Public ID of the project to apply changes to.


### useSingleDocByDocId

Retrieve a single document from the database based on the document's document ID.

Triggers the closest error boundary if the document cannot be found

| Function | Type |
| ---------- | ---------- |
| `useSingleDocByDocId` | `<D extends WriteableDocumentType>({ projectId, docType, docId, lang, }: { projectId: string; docType: D; docId: string; lang?: string or undefined; }) => Pick<UseSuspenseQueryResult<any>, "data" or "error" or "isRefetching">` |

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
| `useSingleDocByVersionId` | `<D extends WriteableDocumentType>({ projectId, docType, versionId, lang, }: { projectId: string; docType: D; versionId: string; lang?: string or undefined; }) => Pick<UseSuspenseQueryResult<any>, "data" or "error" or "isRefetching">` |

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
| `useManyDocs` | `<D extends WriteableDocumentType>({ projectId, docType, includeDeleted, lang, }: { projectId: string; docType: D; includeDeleted?: boolean or undefined; lang?: string or undefined; }) => Pick<UseSuspenseQueryResult<any>, "data" or ... 1 more ... or "isRefetching">` |

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
| `useCreateDocument` | `<D extends WriteableDocumentType>({ docType, projectId, }: { docType: D; projectId: string; }) => FilteredMutationResult<UseMutationResult<any, Error, { value: Omit<any, "schemaName">; }>>` |

Parameters:

* `opts.docType`: Document type to create.
* `opts.projectId`: Public ID of project to create document for.


### useUpdateDocument

Update a document within a project.

| Function | Type |
| ---------- | ---------- |
| `useUpdateDocument` | `<D extends WriteableDocumentType>({ docType, projectId, }: { docType: D; projectId: string; }) => FilteredMutationResult<UseMutationResult<any, Error, { value: Omit<any, "schemaName">; versionId: string; }>>` |

Parameters:

* `opts.docType`: Document type to update.
* `opts.projectId`: Public ID of project document belongs to.


### useDeleteDocument

Delete a document within a project.

| Function | Type |
| ---------- | ---------- |
| `useDeleteDocument` | `<D extends WriteableDocumentType>({ docType, projectId, }: { docType: D; projectId: string; }) => FilteredMutationResult<UseMutationResult<any, Error, { docId: string; }>>` |

Parameters:

* `opts.docType`: Document type to delete.
* `opts.projectId`: Public ID of project document belongs to.


### usePresetsSelection

Retrieve presets for category selection, ordered by project settings.

Returns presets in the order defined by `projectSettings.defaultPresets` for the
specified data type. Falls back to alphabetical order (by preset name) if no defaults are configured.

| Function | Type |
| ---------- | ---------- |
| `usePresetsSelection` | `({ projectId, dataType, lang, }: { projectId: string; dataType: "observation" or "track"; lang?: string or undefined; }) => Preset[]` |

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
| `useManyInvites` | `() => Pick<UseSuspenseQueryResult<Invite[]>, "data" or "error" or "isRefetching">` |

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
| `useSingleInvite` | `({ inviteId, }: { inviteId: string; }) => Pick<UseSuspenseQueryResult<Invite>, "data" or "error" or "isRefetching">` |

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
| `useAcceptInvite` | `() => Pick<Override<MutationObserverIdleResult<any, Error, { inviteId: string; }, unknown>, { mutate: UseMutateFunction<any, Error, { inviteId: string; }, unknown>; }> and { ...; }, "error" or ... 3 more ... or "mutateAsync"> or Pick<...> or Pick<...> or Pick<...>` |

### useRejectInvite

Reject an invite that has been received.

| Function | Type |
| ---------- | ---------- |
| `useRejectInvite` | `() => Pick<Override<MutationObserverIdleResult<any, Error, { inviteId: string; }, unknown>, { mutate: UseMutateFunction<any, Error, { inviteId: string; }, unknown>; }> and { ...; }, "error" or ... 3 more ... or "mutateAsync"> or Pick<...> or Pick<...> or Pick<...>` |

### useSendInvite

Send an invite for a project.

| Function | Type |
| ---------- | ---------- |
| `useSendInvite` | `({ projectId }: { projectId: string; }) => Pick<Override<MutationObserverIdleResult<any, Error, { deviceId: string; roleDescription?: string or undefined; roleId: "f7c150f5a3a9a855" or "012fd2d431c0bf60" or "9e6d29263cba36c9"; roleName?: string or undefined; }, unknown>, { ...; }> and { ...; }, "error" or ... 3 more ... or ...` |

Parameters:

* `opts.projectId`: Public ID of project to send the invite on behalf of.


### useRequestCancelInvite

Request a cancellation of an invite sent to another device.

| Function | Type |
| ---------- | ---------- |
| `useRequestCancelInvite` | `({ projectId }: { projectId: string; }) => Pick<Override<MutationObserverIdleResult<any, Error, { deviceId: string; }, unknown>, { mutate: UseMutateFunction<any, Error, { deviceId: string; }, unknown>; }> and { ...; }, "error" or ... 3 more ... or "mutateAsync"> or Pick<...> or Pick<...> or Pick<...>` |

Parameters:

* `opts.projectId`: Public ID of project to request the invite cancellation for.


### useMapStyleUrl

Get a URL that points to a StyleJSON resource served by the embedded HTTP server.

| Function | Type |
| ---------- | ---------- |
| `useMapStyleUrl` | `() => { data: string; error: Error or null; isRefetching: boolean; }` |

Examples:

```tsx
function ExampleWithoutRefreshToken() {
  const { data, isRefetching } = useMapStyleUrl()

  console.log(data) // logs something like 'http://127.0.0.1:...'
}
```


### useImportCustomMapFile

Import a custom SMP map file, replacing any existing custom map. The mutation
resolves once the file is successfully uploaded and processed by the server.

| Function | Type |
| ---------- | ---------- |
| `useImportCustomMapFile` | `() => Pick<Override<MutationObserverIdleResult<Response, Error, { file: File or ExpoFileDuckType; }, unknown>, { mutate: UseMutateFunction<...>; }> and { ...; }, "error" or ... 3 more ... or "mutateAsync"> or Pick<...> or Pick<...> or Pick<...>` |

Examples:

```tsx
function MapImportExample() {
  const { mutate: importMap } = useImportCustomMapFile()

}
```


### useRemoveCustomMapFile

| Function | Type |
| ---------- | ---------- |
| `useRemoveCustomMapFile` | `() => Pick<Override<MutationObserverIdleResult<Response, Error, void, unknown>, { mutate: UseMutateFunction<Response, Error, void, unknown>; }> and { ...; }, "error" or ... 3 more ... or "mutateAsync"> or Pick<...> or Pick<...> or Pick<...>` |

### useGetCustomMapInfo

| Function | Type |
| ---------- | ---------- |
| `useGetCustomMapInfo` | `() => { data: any; error: Error or null; isRefetching: boolean; }` |

### useManyReceivedMapShares

Get all map shares that the device has received. Automatically updates when
new shares arrive or share states change.

IMPORTANT: This hook will not trigger a re-render when download progress
updates, only when the status changes. This is to avoid excessive re-renders
during downloads. Use `useSingleReceivedMapShare` to get real-time updates on
a specific share, including download progress.

| Function | Type |
| ---------- | ---------- |
| `useManyReceivedMapShares` | `() => any[]` |

Examples:

```tsx
function MapSharesList() {
  const shares = useManyReceivedMapShares()

  return shares.map(share => (
    <div key={share.shareId}>
      {share.mapName} from {share.senderDeviceName} - {share.state}
    </div>
  ))
}
```


### useSingleReceivedMapShare

Get a single received map share based on its shareId.

| Function | Type |
| ---------- | ---------- |
| `useSingleReceivedMapShare` | `({ shareId }: { shareId: string; }) => any` |

Parameters:

* `opts.shareId`: ID of the map share


Examples:

```tsx
function MapShareDetail({ shareId }: { shareId: string }) {
  const share = useSingleReceivedMapShare({ shareId })

  return <div>{share.mapName} - {share.state}</div>
}
```


### useDownloadReceivedMapShare

Accept and download a map share that has been received. The mutate promise
resolves once the map _starts_ downloading, before it finishes downloading.
Use `useManyReceivedMapShares` or `useSingleReceivedMapShare` to track
download progress and final status.

If the sender canceled the share before the receiver calls this, the
mutation will still resolve (the download starts), but the share status will
end up as `'canceled'` rather than `'completed'`. This is the only way the
receiver discovers that a share has been canceled — check `share.status`
after the download settles.

| Function | Type |
| ---------- | ---------- |
| `useDownloadReceivedMapShare` | `() => Pick<Override<MutationObserverIdleResult<void, Error, DownloadMapShareOptions, unknown>, { mutate: UseMutateFunction<void, Error, DownloadMapShareOptions, unknown>; }> and { ...; }, "error" or ... 3 more ... or "mutateAsync"> or Pick<...> or Pick<...> or Pick<...>` |

Examples:

```tsx
function AcceptButton({ shareId }: { shareId: string }) {
  const { mutate: accept } = useDownloadReceivedMapShare()

  return <button onClick={() => accept({ shareId })}>Accept</button>
}
```


### useDeclineReceivedMapShare

Decline a map share that has been received. Notifies the sender that the
share was declined. The share status is only updated to `'declined'` after
the server confirms the decline — there is no optimistic update.

If the sender canceled the share before the decline reaches the server, the
share status will transition to `'canceled'` (not `'error'`) and the
mutation will throw a `MapShareCanceledError`.

| Function | Type |
| ---------- | ---------- |
| `useDeclineReceivedMapShare` | `() => Pick<Override<MutationObserverIdleResult<void, Error, DeclineMapShareOptions, unknown>, { mutate: UseMutateFunction<void, Error, DeclineMapShareOptions, unknown>; }> and { ...; }, "error" or ... 3 more ... or "mutateAsync"> or Pick<...> or Pick<...> or Pick<...>` |

Examples:

```tsx
import { DeclineReason } from '@comapeo/core-react'
function DeclineButton({ shareId }: { shareId: string }) {
  const { mutate: decline } = useDeclineReceivedMapShare()

  return (
    <button onClick={() => decline({ shareId, reason: DeclineReason.user_rejected })}>
      Decline
    </button>
  )
}
```


### useAbortReceivedMapShareDownload

Abort an in-progress map share download.

| Function | Type |
| ---------- | ---------- |
| `useAbortReceivedMapShareDownload` | `() => Pick<Override<MutationObserverIdleResult<void, Error, AbortMapShareOptions, unknown>, { mutate: UseMutateFunction<void, Error, AbortMapShareOptions, unknown>; }> and { ...; }, "error" or ... 3 more ... or "mutateAsync"> or Pick<...> or Pick<...> or Pick<...>` |

Examples:

```tsx
function AbortButton({ shareId }: { shareId: string }) {
  const { mutate: abort } = useAbortReceivedMapShareDownload()

  return <button onClick={() => abort({ shareId })}>Cancel Download</button>
}
```


### useSendMapShare

Share a map with a device. The mutation resolves immediately after sending
the share offer, without waiting for the recipient to accept or reject. The
mutation resolves with the created map share object, including its ID, which
can be used to track the share status with `useSingleSentMapShare`.

| Function | Type |
| ---------- | ---------- |
| `useSendMapShare` | `() => Pick<Override<MutationObserverIdleResult<ServerMapShareState, Error, CreateAndSendMapShareOptions, unknown>, { mutate: UseMutateFunction<ServerMapShareState, Error, CreateAndSendMapShareOptions, unknown>; }> and { ...; }, "error" or ... 3 more ... or "mutateAsync"> or Pick<...> or Pick<...> or Pick<...>` |

Examples:

```tsx
function SendMapButton({ projectId, deviceId }: { projectId: string; deviceId: string }) {
const { mutate: send } = useSendMapShare()

return (
	<button
		onClick={() =>
			send({ receiverDeviceId: deviceId, mapId: 'custom' }, {
                   onSuccess: (mapShare) => {
                       console.log('Share sent with id', mapShare.shareId)
                   }
             )
		}
	>
		Send Map
	</button>
)
}
```


### useCancelSentMapShare

Cancel a map share that was previously sent. If the recipient has not yet
started downloading the share, they will not be notified until they attempt
to accept the share and begin downloading it. If they are already downloading
the share, the download will be canceled before completion. If the download
is already complete, this action will throw an error.

| Function | Type |
| ---------- | ---------- |
| `useCancelSentMapShare` | `() => Pick<Override<MutationObserverIdleResult<void, Error, CancelMapShareOptions, unknown>, { mutate: UseMutateFunction<void, Error, CancelMapShareOptions, unknown>; }> and { ...; }, "error" or ... 3 more ... or "mutateAsync"> or Pick<...> or Pick<...> or Pick<...>` |

Parameters:

* `opts.projectId`: Public ID of project to request the map share cancellation for.


Examples:

```tsx
function CancelShareButton({ projectId, shareId }: { projectId: string; shareId: string }) {
  const { mutate: cancel } = useRequestCancelMapShare({ projectId })

  return <button onClick={() => cancel({ shareId })}>Cancel Share</button>
}
```


### useSingleSentMapShare

Track the status and progress of a sent map share. Returns the current state
of the share, updated in real-time. When the recipient starts downloading, or
if they decline the share, then the returned share will update.

| Function | Type |
| ---------- | ---------- |
| `useSingleSentMapShare` | `({ shareId, }: { shareId: string; }) => ServerMapShareState` |

Parameters:

* `opts.shareId`: ID of the sent map share


Examples:

```tsx
function SentShareStatus({ shareId }: { shareId: string }) {
  const mapShare = useSingleSentMapShare({ shareId })

  return (<div>
		<div>Share status: {mapShare.status}</div>
   {mapShare.status === 'pending' && <div>Waiting for recipient to accept...</div>}
  	{mapShare.status === 'downloading' && (<div>Download in progress: {mapShare.downloadProgress}%</div>)}
  	{mapShare.status === 'declined' && <div>Share was declined by recipient</div>}
	  {mapShare.status === 'canceled' && <div>Share was canceled</div>}
  </div>)
}
```



## Constants

- [ClientApiContext](#clientapicontext)
- [ReceivedMapSharesContext](#receivedmapsharescontext)
- [SentMapSharesContext](#sentmapsharescontext)
- [MapServerContext](#mapservercontext)

### ClientApiContext

| Constant | Type |
| ---------- | ---------- |
| `ClientApiContext` | `Context<any>` |

### ReceivedMapSharesContext

| Constant | Type |
| ---------- | ---------- |
| `ReceivedMapSharesContext` | `Context<{ subscribe: (listener: () => void) => () => boolean; getSnapshot: () => any[]; actions: { download({ shareId }: DownloadMapShareOptions): Promise<void>; decline({ shareId, reason }: DeclineMapShareOptions): Promise<...>; abort({ shareId }: AbortMapShareOptions): Promise<...>; }; } or null>` |

### SentMapSharesContext

| Constant | Type |
| ---------- | ---------- |
| `SentMapSharesContext` | `Context<{ subscribe: (listener: () => void) => () => boolean; getSnapshot: () => ServerMapShareState[]; actions: { createAndSend({ receiverDeviceId, mapId, }: CreateAndSendMapShareOptions): Promise<ServerMapShareState>; cancel({ shareId }: CancelMapShareOptions): Promise<...>; }; } or null>` |

### MapServerContext

| Constant | Type |
| ---------- | ---------- |
| `MapServerContext` | `Context<MapServerApi or null>` |



## Types

- [ClientApiProviderProps](#clientapiproviderprops)
- [MapServerApiOptions](#mapserverapioptions)
- [MapServerApi](#mapserverapi)
- [MapServerProviderProps](#mapserverproviderprops)

### ClientApiProviderProps

| Type | Type |
| ---------- | ---------- |
| `ClientApiProviderProps` | `PropsWithChildren<{ clientApi: MapeoClientApi }>` |

### MapServerApiOptions

| Type | Type |
| ---------- | ---------- |
| `MapServerApiOptions` | `{ getBaseUrl(): Promise<URL> /** * We assume the passed fetch implementation will only accept a `string` as * input, not a `URL` or `Request`, because right now the expo/fetch * implementation will only accept a `string`. Adding this restriction will * catch potential issues if we try to pass a URL in our code. Can be relaxed * when https://github.com/expo/expo/issues/43193 is fixed upstream. */ fetch?(input: string, options?: RequestInit): Promise<Response> }` |

### MapServerApi

| Type | Type |
| ---------- | ---------- |
| `MapServerApi` | `ReturnType<typeof createHttp> and { createEventSource(options: EventSourceOptions): EventSourceClient getMapStyleJsonUrl(mapId: string): Promise<string> }` |

### MapServerProviderProps

| Type | Type |
| ---------- | ---------- |
| `MapServerProviderProps` | `PropsWithChildren< MapServerApiOptions and { queryClient: QueryClient } >` |


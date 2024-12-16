## Functions

- [ClientApiProvider](#clientapiprovider)
- [baseQueryOptions](#basequeryoptions)
- [getClientQueryKey](#getclientquerykey)
- [getDeviceInfoQueryKey](#getdeviceinfoquerykey)
- [getIsArchiveDeviceQueryKey](#getisarchivedevicequerykey)
- [deviceInfoQueryOptions](#deviceinfoqueryoptions)
- [isArchiveDeviceQueryOptions](#isarchivedevicequeryoptions)
- [useClientApi](#useclientapi)
- [useOwnDeviceInfo](#useowndeviceinfo)
- [useIsArchiveDevice](#useisarchivedevice)
- [getDocumentsQueryKey](#getdocumentsquerykey)
- [getManyDocumentsQueryKey](#getmanydocumentsquerykey)
- [getDocumentByDocIdQueryKey](#getdocumentbydocidquerykey)
- [getDocumentByVersionIdQueryKey](#getdocumentbyversionidquerykey)
- [documentsQueryOptions](#documentsqueryoptions)
- [documentByDocumentIdQueryOptions](#documentbydocumentidqueryoptions)
- [documentByVersionIdQueryOptions](#documentbyversionidqueryoptions)
- [getProjectsQueryKey](#getprojectsquerykey)
- [getProjectByIdQueryKey](#getprojectbyidquerykey)
- [getProjectSettingsQueryKey](#getprojectsettingsquerykey)
- [getProjectRoleQueryKey](#getprojectrolequerykey)
- [getMembersQueryKey](#getmembersquerykey)
- [getMemberByIdQueryKey](#getmemberbyidquerykey)
- [getIconUrlQueryKey](#geticonurlquerykey)
- [getDocumentCreatedByQueryKey](#getdocumentcreatedbyquerykey)
- [getAttachmentUrlQueryKey](#getattachmenturlquerykey)
- [projectsQueryOptions](#projectsqueryoptions)
- [projectByIdQueryOptions](#projectbyidqueryoptions)
- [projectSettingsQueryOptions](#projectsettingsqueryoptions)
- [projectMembersQueryOptions](#projectmembersqueryoptions)
- [projectMemberByIdQueryOptions](#projectmemberbyidqueryoptions)
- [projectOwnRoleQueryOptions](#projectownrolequeryoptions)
- [iconUrlQueryOptions](#iconurlqueryoptions)
- [documentCreatedByQueryOptions](#documentcreatedbyqueryoptions)
- [attachmentUrlQueryOptions](#attachmenturlqueryoptions)
- [useProjectSettings](#useprojectsettings)
- [useSingleProject](#usesingleproject)
- [useManyProjects](#usemanyprojects)
- [useSingleMember](#usesinglemember)
- [useManyMembers](#usemanymembers)
- [useIconUrl](#useiconurl)
- [useAttachmentUrl](#useattachmenturl)
- [useDocumentCreatedBy](#usedocumentcreatedby)
- [useSingleDocByDocId](#usesingledocbydocid)
- [useSingleDocByVersionId](#usesingledocbyversionid)
- [useManyDocs](#usemanydocs)
- [getMapsQueryKey](#getmapsquerykey)
- [getStyleJsonUrlQueryKey](#getstylejsonurlquerykey)
- [mapStyleJsonUrlQueryOptions](#mapstylejsonurlqueryoptions)
- [useMapStyleUrl](#usemapstyleurl)
- [getInvitesQueryKey](#getinvitesquerykey)
- [getPendingInvitesQueryKey](#getpendinginvitesquerykey)
- [pendingInvitesQueryOptions](#pendinginvitesqueryoptions)

### ClientApiProvider

Create a context provider that holds a CoMapeo API client instance.

| Function | Type |
| ---------- | ---------- |
| `ClientApiProvider` | `({ children, clientApi, }: { children: ReactNode; clientApi: MapeoClientApi; }) => FunctionComponentElement<ProviderProps<MapeoClientApi or null>>` |

Parameters:

* `opts.children`: React children node
* `opts.clientApi`: Client API instance


### baseQueryOptions

| Function | Type |
| ---------- | ---------- |
| `baseQueryOptions` | `() => { networkMode: "always"; retry: number; }` |

### getClientQueryKey

| Function | Type |
| ---------- | ---------- |
| `getClientQueryKey` | `() => readonly ["@comapeo/core-react", "client"]` |

### getDeviceInfoQueryKey

| Function | Type |
| ---------- | ---------- |
| `getDeviceInfoQueryKey` | `() => readonly ["@comapeo/core-react", "client", "device_info"]` |

### getIsArchiveDeviceQueryKey

| Function | Type |
| ---------- | ---------- |
| `getIsArchiveDeviceQueryKey` | `() => readonly ["@comapeo/core-react", "client", "is_archive_device"]` |

### deviceInfoQueryOptions

| Function | Type |
| ---------- | ---------- |
| `deviceInfoQueryOptions` | `({ clientApi, }: { clientApi: MapeoClientApi; }) => OmitKeyof<UseQueryOptions<{ deviceId: string; deviceType: "device_type_unspecified" or "mobile" or "tablet" or "desktop" or "selfHostedServer" or "UNRECOGNIZED"; } and Partial<...>, Error, { ...; } and Partial<...>, QueryKey>, "queryFn"> and { ...; } and { ...; }` |

### isArchiveDeviceQueryOptions

| Function | Type |
| ---------- | ---------- |
| `isArchiveDeviceQueryOptions` | `({ clientApi, }: { clientApi: MapeoClientApi; }) => OmitKeyof<UseQueryOptions<boolean, Error, boolean, QueryKey>, "queryFn"> and { ...; } and { ...; }` |

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
| `useOwnDeviceInfo` | `() => { data: { deviceId: string; deviceType: "device_type_unspecified" or "mobile" or "tablet" or "desktop" or "selfHostedServer" or "UNRECOGNIZED"; } and Partial<DeviceInfoParam>; error: Error or null; isRefetching: boolean; }` |

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


### getDocumentsQueryKey

| Function | Type |
| ---------- | ---------- |
| `getDocumentsQueryKey` | `<D extends DocumentType>({ projectId, docType, }: { projectId: string; docType: D; }) => readonly ["@comapeo/core-react", "projects", string, D]` |

### getManyDocumentsQueryKey

| Function | Type |
| ---------- | ---------- |
| `getManyDocumentsQueryKey` | `<D extends DocumentType>({ projectId, docType, includeDeleted, lang, }: { projectId: string; docType: D; includeDeleted?: boolean or undefined; lang?: string or undefined; }) => readonly ["@comapeo/core-react", "projects", string, D, { ...; }]` |

### getDocumentByDocIdQueryKey

| Function | Type |
| ---------- | ---------- |
| `getDocumentByDocIdQueryKey` | `<D extends DocumentType>({ projectId, docType, docId, lang, }: { projectId: string; docType: D; docId: string; lang?: string or undefined; }) => readonly ["@comapeo/core-react", "projects", string, D, string, { readonly lang: string or undefined; }]` |

### getDocumentByVersionIdQueryKey

| Function | Type |
| ---------- | ---------- |
| `getDocumentByVersionIdQueryKey` | `<D extends DocumentType>({ projectId, docType, versionId, lang, }: { projectId: string; docType: D; versionId: string; lang?: string or undefined; }) => readonly ["@comapeo/core-react", "projects", string, D, string, { readonly lang: string or undefined; }]` |

### documentsQueryOptions

| Function | Type |
| ---------- | ---------- |
| `documentsQueryOptions` | `<D extends DocumentType>({ projectApi, projectId, docType, includeDeleted, lang, }: { projectApi: ClientApi<MapeoProject>; projectId: string; docType: D; includeDeleted?: boolean or undefined; lang?: string or undefined; }) => OmitKeyof<...> and ... 1 more ... and { ...; }` |

### documentByDocumentIdQueryOptions

| Function | Type |
| ---------- | ---------- |
| `documentByDocumentIdQueryOptions` | `<D extends DocumentType>({ projectApi, projectId, docType, docId, lang, }: { projectApi: ClientApi<MapeoProject>; projectId: string; docType: D; docId: string; lang?: string or undefined; }) => OmitKeyof<UseQueryOptions<({ schemaName: "track"; ... 9 more ...; deleted: boolean; } and { ...; }) or ({ ...; } and { ...; }) or ...` |

### documentByVersionIdQueryOptions

| Function | Type |
| ---------- | ---------- |
| `documentByVersionIdQueryOptions` | `<D extends DocumentType>({ projectApi, projectId, docType, versionId, lang, }: { projectApi: ClientApi<MapeoProject>; projectId: string; docType: D; versionId: string; lang?: string or undefined; }) => OmitKeyof<UseQueryOptions<{ schemaName: "track"; ... 9 more ...; deleted: boolean; } or { ...; } or { ...; } or { ...; ...` |

### getProjectsQueryKey

| Function | Type |
| ---------- | ---------- |
| `getProjectsQueryKey` | `() => readonly ["@comapeo/core-react", "projects"]` |

### getProjectByIdQueryKey

| Function | Type |
| ---------- | ---------- |
| `getProjectByIdQueryKey` | `({ projectId }: { projectId: string; }) => readonly ["@comapeo/core-react", "projects", string]` |

### getProjectSettingsQueryKey

| Function | Type |
| ---------- | ---------- |
| `getProjectSettingsQueryKey` | `({ projectId, }: { projectId: string; }) => readonly ["@comapeo/core-react", "projects", string, "project_settings"]` |

### getProjectRoleQueryKey

| Function | Type |
| ---------- | ---------- |
| `getProjectRoleQueryKey` | `({ projectId }: { projectId: string; }) => readonly ["@comapeo/core-react", "projects", string, "role"]` |

### getMembersQueryKey

| Function | Type |
| ---------- | ---------- |
| `getMembersQueryKey` | `({ projectId }: { projectId: string; }) => readonly ["@comapeo/core-react", "projects", string, "members"]` |

### getMemberByIdQueryKey

| Function | Type |
| ---------- | ---------- |
| `getMemberByIdQueryKey` | `({ projectId, deviceId, }: { projectId: string; deviceId: string; }) => readonly ["@comapeo/core-react", "projects", string, "members", string]` |

### getIconUrlQueryKey

| Function | Type |
| ---------- | ---------- |
| `getIconUrlQueryKey` | `({ projectId, iconId, ...mimeBasedOpts }: { projectId: string; iconId: string; } and (BitmapOpts or SvgOpts)) => readonly ["@comapeo/core-react", "projects", string, "icons", string, { mimeType: "image/png"; pixelDensity: 2 or ... 1 more ... or 1; size: ValidSizes; } or { ...; }]` |

### getDocumentCreatedByQueryKey

| Function | Type |
| ---------- | ---------- |
| `getDocumentCreatedByQueryKey` | `({ projectId, originalVersionId, }: { projectId: string; originalVersionId: string; }) => readonly ["@comapeo/core-react", "projects", string, "document_created_by", string]` |

### getAttachmentUrlQueryKey

| Function | Type |
| ---------- | ---------- |
| `getAttachmentUrlQueryKey` | `({ projectId, blobId, }: { projectId: string; blobId: BlobId; }) => readonly ["@comapeo/core-react", "projects", string, "attachments", BlobId]` |

### projectsQueryOptions

| Function | Type |
| ---------- | ---------- |
| `projectsQueryOptions` | `({ clientApi, }: { clientApi: MapeoClientApi; }) => OmitKeyof<UseQueryOptions<(Pick<{ schemaName: "projectSettings"; name?: string or undefined; defaultPresets?: { point: string[]; area: string[]; vertex: string[]; line: string[]; relation: string[]; } or undefined; configMetadata?: { ...; } or undefined; }, "name"> and ...` |

### projectByIdQueryOptions

| Function | Type |
| ---------- | ---------- |
| `projectByIdQueryOptions` | `({ clientApi, projectId, }: { clientApi: MapeoClientApi; projectId: string; }) => OmitKeyof<UseQueryOptions<ClientApi<MapeoProject>, Error, ClientApi<MapeoProject>, QueryKey>, "queryFn"> and { ...; } and { ...; }` |

### projectSettingsQueryOptions

| Function | Type |
| ---------- | ---------- |
| `projectSettingsQueryOptions` | `({ projectApi, projectId, }: { projectApi: ClientApi<MapeoProject>; projectId: string; }) => OmitKeyof<UseQueryOptions<EditableProjectSettings, Error, EditableProjectSettings, QueryKey>, "queryFn"> and { ...; } and { ...; }` |

### projectMembersQueryOptions

| Function | Type |
| ---------- | ---------- |
| `projectMembersQueryOptions` | `({ projectApi, projectId, }: { projectApi: ClientApi<MapeoProject>; projectId: string; }) => OmitKeyof<UseQueryOptions<MemberInfo[], Error, MemberInfo[], QueryKey>, "queryFn"> and { ...; } and { ...; }` |

### projectMemberByIdQueryOptions

| Function | Type |
| ---------- | ---------- |
| `projectMemberByIdQueryOptions` | `({ projectApi, projectId, deviceId, }: { projectApi: ClientApi<MapeoProject>; projectId: string; deviceId: string; }) => OmitKeyof<UseQueryOptions<MemberInfo, Error, MemberInfo, QueryKey>, "queryFn"> and { ...; } and { ...; }` |

### projectOwnRoleQueryOptions

| Function | Type |
| ---------- | ---------- |
| `projectOwnRoleQueryOptions` | `({ projectApi, projectId, }: { projectApi: ClientApi<MapeoProject>; projectId: string; }) => OmitKeyof<UseQueryOptions<Role<"a12a6702b93bd7ff" or "f7c150f5a3a9a855" or "012fd2d431c0bf60" or "9e6d29263cba36c9" or "8ced989b1904606b" or "08e4251e36f6e7ed">, Error, Role<...>, QueryKey>, "queryFn"> and { ...; } and { ...; }` |

### iconUrlQueryOptions

| Function | Type |
| ---------- | ---------- |
| `iconUrlQueryOptions` | `({ projectApi, projectId, iconId, ...mimeBasedOpts }: { projectApi: ClientApi<MapeoProject>; projectId: string; iconId: string; } and (BitmapOpts or SvgOpts)) => OmitKeyof<UseQueryOptions<string, Error, string, QueryKey>, "queryFn"> and { ...; } and { ...; }` |

### documentCreatedByQueryOptions

| Function | Type |
| ---------- | ---------- |
| `documentCreatedByQueryOptions` | `({ projectApi, projectId, originalVersionId, }: { projectApi: ClientApi<MapeoProject>; projectId: string; originalVersionId: string; }) => OmitKeyof<UseQueryOptions<string, Error, string, QueryKey>, "queryFn"> and { ...; } and { ...; }` |

### attachmentUrlQueryOptions

| Function | Type |
| ---------- | ---------- |
| `attachmentUrlQueryOptions` | `({ projectApi, projectId, blobId, }: { projectApi: ClientApi<MapeoProject>; projectId: string; blobId: BlobId; }) => OmitKeyof<UseQueryOptions<string, Error, string, QueryKey>, "queryFn"> and { ...; } and { ...; }` |

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


### useSingleDocByDocId

Retrieve a single document from the database based on the document's document ID.

Triggers the closest error boundary if the document cannot be found

| Function | Type |
| ---------- | ---------- |
| `useSingleDocByDocId` | `<D extends DocumentType>({ projectId, docType, docId, lang, }: { projectId: string; docType: D; docId: string; lang?: string or undefined; }) => { data: ({ schemaName: "track"; locations: Position[]; observationRefs: { docId: string; versionId: string; }[]; ... 7 more ...; deleted: boolean; } and { ...; }) or ({ ...; } ...` |

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
| `useSingleDocByVersionId` | `<D extends DocumentType>({ projectId, docType, versionId, lang, }: { projectId: string; docType: D; versionId: string; lang?: string or undefined; }) => { data: { schemaName: "track"; locations: Position[]; observationRefs: { ...; }[]; ... 7 more ...; deleted: boolean; } or { ...; } or { ...; } or { ...; } or { ...; }; e...` |

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
| `useManyDocs` | `<D extends DocumentType>({ projectId, docType, includeDeleted, lang, }: { projectId: string; docType: D; includeDeleted?: boolean or undefined; lang?: string or undefined; }) => { data: ({ schemaName: "track"; locations: Position[]; ... 8 more ...; deleted: boolean; } and { ...; })[] or ({ ...; } and { ...; })[] or ({ ...; ...` |

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


### getMapsQueryKey

| Function | Type |
| ---------- | ---------- |
| `getMapsQueryKey` | `() => readonly ["@comapeo/core-react", "maps"]` |

### getStyleJsonUrlQueryKey

| Function | Type |
| ---------- | ---------- |
| `getStyleJsonUrlQueryKey` | `({ refreshToken, }: { refreshToken?: string or undefined; }) => readonly ["@comapeo/core-react", "maps", "stylejson_url", { readonly refreshToken: string or undefined; }]` |

### mapStyleJsonUrlQueryOptions

| Function | Type |
| ---------- | ---------- |
| `mapStyleJsonUrlQueryOptions` | `({ clientApi, refreshToken, }: { clientApi: MapeoClientApi; refreshToken?: string or undefined; }) => OmitKeyof<UseQueryOptions<string, Error, string, QueryKey>, "queryFn"> and { ...; } and { ...; }` |

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


### getInvitesQueryKey

| Function | Type |
| ---------- | ---------- |
| `getInvitesQueryKey` | `() => readonly ["@comapeo/core-react", "invites"]` |

### getPendingInvitesQueryKey

| Function | Type |
| ---------- | ---------- |
| `getPendingInvitesQueryKey` | `() => readonly ["@comapeo/core-react", "invites", { readonly status: "pending"; }]` |

### pendingInvitesQueryOptions

| Function | Type |
| ---------- | ---------- |
| `pendingInvitesQueryOptions` | `({ clientApi, }: { clientApi: MapeoClientApi; }) => OmitKeyof<UseQueryOptions<MapBuffers<InviteInternal>[], Error, MapBuffers<InviteInternal>[], QueryKey>, "queryFn"> and { ...; } and { ...; }` |


## Constants

- [ClientApiContext](#clientapicontext)
- [ROOT_QUERY_KEY](#root_query_key)

### ClientApiContext

| Constant | Type |
| ---------- | ---------- |
| `ClientApiContext` | `Context<MapeoClientApi or null>` |

### ROOT_QUERY_KEY

| Constant | Type |
| ---------- | ---------- |
| `ROOT_QUERY_KEY` | `"@comapeo/core-react"` |



## Types

- [DocumentType](#documenttype)

### DocumentType

| Type | Type |
| ---------- | ---------- |
| `DocumentType` | `Extract< MapeoDoc['schemaName'], 'field' or 'observation' or 'preset' or 'track' or 'remoteDetectionAlert' >` |


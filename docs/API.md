## Functions

- [ClientApiProvider](#clientapiprovider)
- [useClientApi](#useclientapi)
- [useOwnDeviceInfo](#useowndeviceinfo)
- [useIsArchiveDevice](#useisarchivedevice)
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
- [useMapStyleUrl](#usemapstyleurl)

### ClientApiProvider

Create a context provider that holds a CoMapeo API client instance.

| Function | Type |
| ---------- | ---------- |
| `ClientApiProvider` | `({ children, clientApi, }: { children: ReactNode; clientApi: MapeoClientApi; }) => FunctionComponentElement<ProviderProps<MapeoClientApi or null>>` |

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
| `useSingleDocByDocId` | `<D extends DocumentType>({ projectId, docType, docId, lang, }: { projectId: string; docType: D; docId: string; lang?: string or undefined; }) => ReadHookResult<Extract<{ schemaName: "translation"; docRef: { docId: string; versionId: string; }; docRefType: "track" or ... 7 more ... or "type_unspecified"; ... 10 more ......` |

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
| `useSingleDocByVersionId` | `<D extends DocumentType>({ projectId, docType, versionId, lang, }: { projectId: string; docType: D; versionId: string; lang?: string or undefined; }) => ReadHookResult<Extract<{ schemaName: "translation"; docRef: { docId: string; versionId: string; }; docRefType: "track" or ... 7 more ... or "type_unspecified"; ... 10 ...` |

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
| `useManyDocs` | `<D extends DocumentType>({ projectId, docType, includeDeleted, lang, }: { projectId: string; docType: D; includeDeleted?: boolean or undefined; lang?: string or undefined; }) => ReadHookResult<Extract<{ schemaName: "translation"; docRef: { docId: string; versionId: string; }; ... 11 more ...; deleted: boolean; }, { .....` |

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



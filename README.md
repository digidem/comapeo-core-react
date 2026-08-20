# @comapeo/core-react

React wrapper for working with [`@comapeo/core`](https://github.com/digidem/comapeo-core)

## Installation

`react`, `@tanstack/react-query`, `@comapeo/schema`, `@comapeo/core`, and `@comapeo/ipc` are peer deps and must be installed alongside this package. You may want to pin these to specific versions depending on your needs.

```sh
npm install react @tanstack/react-query@5 @comapeo/core-react @comapeo/core @comapeo/ipc
```

## Setup

### Basic Setup

Wrap your application with `ComapeoCoreProvider` and a React Query `QueryClientProvider`. You will need to be running an instance of [`@comapeo/map-server`](https://github.com/digidem/comapeo-map-server) and provide a `getMapServerBaseUrl` function that returns a Promise resolving to the base URL of your map server:

In the server:

```ts
import { ComapeoCoreProvider } from '@comapeo/core-react'
import {
	createComapeoCoreServer,
	createComapeoServicesServer,
} from '@comapeo/ipc/server.js'
import { createServer } from '@comapeo/map-server'

const mapServer = createServer()
const listenPromise = mapServer.listen()

const servicesServer = createComapeoServicesServer(
	{
		mapServer: {
			getBaseUrl: async () => {
				const { localPort } = await listenPromise()
				return `http://localhost:${localPort}`
			},
		},
	},
	port,
)
```

In the client:

```tsx
import {
	createComapeoCoreClient,
	createComapeoServicesClient,
} from '@comapeo/ipc/client.js'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

const servicesClient = createComapeoServicesClient(port)

function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<ComapeoCoreProvider
				clientApi={clientApi}
				queryClient={queryClient}
				getMapServerBaseUrl={servicesClient.mapServer.getBaseUrl}
			>
				<MyApp />
			</ComapeoCoreProvider>
		</QueryClientProvider>
	)
}
```

Hooks that communicate with the map server will wait for `getMapServerBaseUrl()` to resolve before making requests, so the provider can be mounted before the server is ready. You can also provide an optional `fetch` prop to use a custom fetch implementation.

### Recovering from a backend restart

On platforms where the backend can restart underneath a running app — Android, where it lives in a separate OS process that the system may kill under memory pressure — pass a `subscribeToBackendRestart` function. It receives a listener and returns a function that removes it. Call the listener once the transport has reconnected, i.e. once requests will reach the new backend:

```tsx
// Defined outside the component (or wrapped in `useCallback`) so that its
// identity is stable: a new function on every render makes the provider
// unsubscribe and resubscribe on every render.
function subscribeToBackendRestart(listener: () => void) {
	return subscribeToRestarts(listener)
}

function App() {
	return (
		<ComapeoCoreProvider
			clientApi={clientApi}
			queryClient={queryClient}
			getMapServerBaseUrl={servicesClient.mapServer.getBaseUrl}
			subscribeToBackendRestart={subscribeToBackendRestart}
		>
			<MyApp />
		</ComapeoCoreProvider>
	)
}
```

Platforms whose backend cannot outlive the app, such as desktop, should omit the prop.

#### What a notification does

The client API and every project reference survive a restart: under `@comapeo/ipc` v10 a project reference is permanent, and its channel re-opens transparently against the new backend. What does not survive is the data read through them — the media server comes back on a different port, and everything the backend held in memory (invites, sync state) is gone. On each notification the provider resets its own queries (never the consuming app's) in four steps:

1. **Removes** every query read through a project instance — project settings, members, documents, and the cached media server origin. Removal, rather than invalidation, is what reaches the media server origin, which is cached with `staleTime: 'static'` and so cannot be invalidated at all. It also guarantees that a fetcher which failed as the old backend went away cannot stay latched in `status: 'error'`, which a suspense query with retries disabled never recovers from.
2. **Resets** the cached per-project API instances. This is what makes mounted screens react: removal on its own is invisible to a mounted component, which keeps rendering its last result, whereas a reset suspends it. On resume it re-runs the queries removed in step 1.
3. **Invalidates** what is left — device info, invites, the project list. These are read through the client API, so a background refetch is enough and screens showing them do not flash a loading state.
4. **Refreshes** the sync state, which is an external store rather than a query. Because the project reference is permanent, step 2 hands back the same store, so the error it latched when the backend went away has to be cleared and its state re-read explicitly.

#### Projects this device has left

A restart is recoverable; leaving a project is not. Every call on a project this device has left rejects with an error carrying `code: 'PROJECT_LEFT'`, as does `useSingleProject` for a project left before it was ever fetched. That error is deliberately neither retried nor reset — it surfaces at the nearest error boundary, and the project only becomes usable again by re-joining through an invite.

#### What it does not cover

- **In-memory map share state.** The received and sent map share stores are plain in-memory stores, not queries, and are not reset, so a share that was pending when the backend restarted stays pending. A share that was _downloading_ does end up in `error` with code `EVENT_STREAM_ERROR`, because its progress stream cannot be re-established against the new map server. Resuming an interrupted download is a separate piece of work.
- **Events emitted during the disconnect window.** Invites, sync state and `map-share` events raised while the app was disconnected from the backend are lost. Refetching the queries above is the compensation for this: the state they carry is re-read from the new backend, but one-off notifications are not replayed.

## API Documentation

Still a work in progress. Currently lives in [`docs/API.md`](./docs/API.md).

## Contributing

See contributing docs in [`docs/CONTRIBUTING.md`](./docs/CONTRIBUTING.md)

## License

[MIT](./LICENSE)

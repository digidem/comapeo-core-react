# @comapeo/core-react

React wrapper for working with [`@comapeo/core`](https://github.com/digidem/comapeo-core)

## Installation

`react`, `@tanstack/react-query`, `@comapeo/schema`, `@comapeo/core`, and `@comapeo/ipc` are peer deps and must be installed alongside this package. You may want to pin these to specific versions depending on your needs.

```sh
npm install react @tanstack/react-query@5 @comapeo/core-react @comapeo/schema @comapeo/core @comapeo/ipc
```

## Setup

### Basic Setup

Wrap your application with `ClientApiProvider` and a React Query `QueryClientProvider`:

```tsx
import { ClientApiProvider } from '@comapeo/core-react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<ClientApiProvider clientApi={clientApi}>
				<MyApp />
			</ClientApiProvider>
		</QueryClientProvider>
	)
}
```

### Map Sharing Setup

To use the map sharing hooks, you also need to wrap your application with `MapServerProvider`. Create a `MapServerState` instance and call `setPort()` once the `@comapeo/map-server` has started:

```tsx
import { createMapServerState, MapServerProvider } from '@comapeo/core-react'

const mapServerState = createMapServerState()

// When your map server starts and you know the port:
mapServerState.setPort(8080)

function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<ClientApiProvider clientApi={clientApi}>
				<MapServerProvider mapServerState={mapServerState}>
					<MyApp />
				</MapServerProvider>
			</ClientApiProvider>
		</QueryClientProvider>
	)
}
```

Hooks that communicate with the map server (e.g. `useSendMapShare`, `useAcceptMapShare`) will queue their requests until `setPort()` is called, so the provider can be mounted before the server is ready.

## API Documentation

Still a work in progress. Currently lives in [`docs/API.md`](./docs/API.md).

## Contributing

See contributing docs in [`docs/CONTRIBUTING.md`](./docs/CONTRIBUTING.md)

## License

[MIT](./LICENSE)

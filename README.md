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

const getMapServerBaseUrl = async () => {
	return new URL(await servicesClient.mapServer.getBaseUrl())
}

function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<ComapeoCoreProvider
				clientApi={clientApi}
				queryClient={queryClient}
				getMapServerBaseUrl={getMapServerBaseUrl}
			>
				<MyApp />
			</ComapeoCoreProvider>
		</QueryClientProvider>
	)
}
```

Hooks that communicate with the map server will wait for `getMapServerBaseUrl()` to resolve before making requests, so the provider can be mounted before the server is ready. You can also provide an optional `fetch` prop to use a custom fetch implementation.

## API Documentation

Still a work in progress. Currently lives in [`docs/API.md`](./docs/API.md).

## Contributing

See contributing docs in [`docs/CONTRIBUTING.md`](./docs/CONTRIBUTING.md)

## License

[MIT](./LICENSE)

# @comapeo/core-react

React wrapper for working with [`@comapeo/core`](https://github.com/digidem/comapeo-core)

## Installation

`react`, `@tanstack/react-query`, `@comapeo/schema`, `@comapeo/core`, and `@comapeo/ipc` are peer deps and must be installed alongside this package. You may want to pin these to specific versions depending on your needs.

```sh
npm install react @tanstack/react-query@5 @comapeo/core-react @comapeo/schema @comapeo/core @comapeo/ipc
```

## Setup

### Basic Setup

Wrap your application with `ComapeoCoreProvider` and a React Query `QueryClientProvider`. You will need to be running an instance of [`@comapeo/map-server`](https://github.com/digidem/comapeo-map-server) and provide a `getMapServerBaseUrl` function that returns a Promise resolving to the base URL of your map server:

```tsx
import { ComapeoCoreProvider } from '@comapeo/core-react'
import { createServer } from '@comapeo/map-server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

const server = createServer()
const listenPromise = server.listen()

const getMapServerBaseUrl = async () => {
	const { localPort } = await listenPromise
	return new URL(`http://localhost:${localPort}/`)
}

function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<ComapeoCoreProvider
				clientApi={clientApi}
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

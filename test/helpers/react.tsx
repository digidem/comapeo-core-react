import { type MapeoClientApi } from '@comapeo/ipc'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type PropsWithChildren } from 'react'

import { ClientApiProvider } from '../../src/index.js'

export function createClientApiWrapper({
	clientApi,
	queryClient,
}: {
	clientApi: MapeoClientApi
	queryClient?: QueryClient
}) {
	const qc = queryClient || new QueryClient()

	return ({ children }: PropsWithChildren<unknown>) => {
		return (
			<QueryClientProvider client={qc}>
				<ClientApiProvider clientApi={clientApi}>{children}</ClientApiProvider>
			</QueryClientProvider>
		)
	}
}

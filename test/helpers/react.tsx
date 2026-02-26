import { type MapeoClientApi } from '@comapeo/ipc'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type PropsWithChildren } from 'react'

import { ComapeoCoreProvider } from '../../src/index.js'
import { createMockClientApi } from './client-api-mock.js'

export function createWrapper({
	clientApi = createMockClientApi() as unknown as MapeoClientApi,
	queryClient = new QueryClient(),
	getMapServerBaseUrl = async () => new URL('http://localhost:3000'),
}: {
	clientApi?: MapeoClientApi
	queryClient?: QueryClient
	getMapServerBaseUrl?: () => Promise<URL>
} = {}) {
	return ({ children }: PropsWithChildren<unknown>) => {
		return (
			<QueryClientProvider client={queryClient}>
				<ComapeoCoreProvider
					queryClient={queryClient}
					clientApi={clientApi}
					getMapServerBaseUrl={getMapServerBaseUrl}
				>
					{children}
				</ComapeoCoreProvider>
			</QueryClientProvider>
		)
	}
}

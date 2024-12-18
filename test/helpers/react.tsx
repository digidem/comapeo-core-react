import { type MapeoClientApi } from '@comapeo/ipc'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type PropsWithChildren } from 'react'

import { ClientApiProvider } from '../../src/index.js'

export function createClientApiWrapper({
	clientApi,
}: {
	clientApi: MapeoClientApi
}) {
	const queryClient = new QueryClient()

	return ({ children }: PropsWithChildren<unknown>) => {
		return (
			<QueryClientProvider client={queryClient}>
				<ClientApiProvider clientApi={clientApi}>{children}</ClientApiProvider>
			</QueryClientProvider>
		)
	}
}

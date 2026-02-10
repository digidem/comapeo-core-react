import type { MapeoClientApi } from '@comapeo/ipc'
import { createElement, useMemo, type JSX, type ReactNode } from 'react'

import { ClientApiProvider } from '../index.js'
import { createMapServerApi, type MapServerApiOptions } from './MapServer.js'
import { ReceivedMapSharesProvider } from './ReceivedMapShares.js'
import { SentMapSharesProvider } from './SentMapShares.js'

export const Provider = ({
	children,
	clientApi,
	getBaseUrl,
	fetch,
}: {
	children: ReactNode
	clientApi: MapeoClientApi
} & MapServerApiOptions): JSX.Element => {
	const mapServerApi = useMemo(
		() => createMapServerApi({ getBaseUrl, fetch }),
		[getBaseUrl, fetch],
	)
	return createElement(
		ClientApiProvider,
		{ clientApi },
		createElement(
			SentMapSharesProvider,
			{ clientApi, mapServerApi },
			createElement(
				ReceivedMapSharesProvider,
				{ clientApi, mapServerApi },
				children,
			),
		),
	)
}

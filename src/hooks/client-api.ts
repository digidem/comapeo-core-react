import { useContext } from 'react'

import { ClientApiContext } from '../contexts/ClientApi.js'

export function useClientApi() {
  const clientApi = useContext(ClientApiContext)

  if (!clientApi) {
    throw new Error(
      'No client API set. Make sure you set up the ClientApiContext provider properly',
    )
  }

  return clientApi
}

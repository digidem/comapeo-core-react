import type { MapeoClientApi } from '@comapeo/ipc'
import { createContext, createElement, type PropsWithChildren } from 'react'

export const ClientApiContext = createContext<MapeoClientApi | null>(null)

export function ApiProvider({
  clientApi,
  children,
}: PropsWithChildren<{ clientApi: MapeoClientApi }>) {
  return createElement(
    ClientApiContext.Provider,
    { value: clientApi },
    children,
  )
}

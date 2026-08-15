import { createContext } from 'react'

export type EventTokenContextValue = {
  getEventToken: (shareToken: string, preferAdmin: boolean) => string
  getAdminToken: (shareToken: string) => string | null
  setAdminToken: (shareToken: string, adminToken: string) => void
}

export const eventTokenContext = createContext<EventTokenContextValue | null>(null)
import { useMemo, useState, type ReactNode } from 'react'

import { eventTokenContext, type EventTokenContextValue } from './eventTokenContext'

type AdminTokenMap = Record<string, string>

const ADMIN_TOKEN_STORAGE_KEY_PREFIX = 'listcollab:admin-token:'

function getStorageKey(shareToken: string): string {
  return `${ADMIN_TOKEN_STORAGE_KEY_PREFIX}${shareToken}`
}

function readSessionAdminToken(shareToken: string): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  return window.sessionStorage.getItem(getStorageKey(shareToken))
}

function writeSessionAdminToken(shareToken: string, adminToken: string): void {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.setItem(getStorageKey(shareToken), adminToken)
}

type EventTokenProviderProps = {
  children: ReactNode
}

export function EventTokenProvider({ children }: EventTokenProviderProps): React.JSX.Element {
  const [adminTokens, setAdminTokens] = useState<AdminTokenMap>({})

  const value = useMemo<EventTokenContextValue>(
    () => ({
      getEventToken: (shareToken, preferAdmin) => {
        const adminToken = adminTokens[shareToken] ?? readSessionAdminToken(shareToken)

        if (preferAdmin && adminToken) {
          return adminToken
        }

        return shareToken
      },
      getAdminToken: (shareToken) => adminTokens[shareToken] ?? readSessionAdminToken(shareToken) ?? null,
      setAdminToken: (shareToken, adminToken) => {
        writeSessionAdminToken(shareToken, adminToken)
        setAdminTokens((currentTokens) => ({
          ...currentTokens,
          [shareToken]: adminToken,
        }))
      },
    }),
    [adminTokens]
  )

  return <eventTokenContext.Provider value={value}>{children}</eventTokenContext.Provider>
}
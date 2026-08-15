import { useMemo, useState, type ReactNode } from 'react'

import { eventTokenContext, type EventTokenContextValue } from './eventTokenContext'

type AdminTokenMap = Record<string, string>

type EventTokenProviderProps = {
  children: ReactNode
}

export function EventTokenProvider({ children }: EventTokenProviderProps): React.JSX.Element {
  const [adminTokens, setAdminTokens] = useState<AdminTokenMap>({})

  const value = useMemo<EventTokenContextValue>(
    () => ({
      getEventToken: (shareToken, preferAdmin) => {
        if (preferAdmin && adminTokens[shareToken]) {
          return adminTokens[shareToken]
        }

        return shareToken
      },
      getAdminToken: (shareToken) => adminTokens[shareToken] ?? null,
      setAdminToken: (shareToken, adminToken) => {
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
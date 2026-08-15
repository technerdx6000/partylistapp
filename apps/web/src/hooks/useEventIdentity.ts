import { useCallback, useEffect, useState } from 'react'

const identityStoragePrefix = 'listcollab:identity:'

export type EventIdentity = {
  participantId: number
  displayName: string
}

function getStorageKey(shareToken: string): string {
  return `${identityStoragePrefix}${shareToken}`
}

function parseStoredIdentity(rawValue: string | null): EventIdentity | null {
  if (!rawValue) {
    return null
  }

  try {
    const parsedValue = JSON.parse(rawValue) as unknown

    if (
      typeof parsedValue === 'object' &&
      parsedValue !== null &&
      typeof (parsedValue as Record<string, unknown>).participantId === 'number' &&
      typeof (parsedValue as Record<string, unknown>).displayName === 'string'
    ) {
      const candidate = parsedValue as Record<string, unknown>

      return {
        participantId: candidate.participantId as number,
        displayName: candidate.displayName as string,
      }
    }
  } catch {
    return null
  }

  return null
}

export function useEventIdentity(shareToken: string) {
  const [identity, setIdentityState] = useState<EventIdentity | null>(null)

  useEffect(() => {
    if (!shareToken || typeof window === 'undefined') {
      setIdentityState(null)
      return
    }

    setIdentityState(parseStoredIdentity(window.localStorage.getItem(getStorageKey(shareToken))))
  }, [shareToken])

  const clearIdentity = useCallback(() => {
    if (!shareToken || typeof window === 'undefined') {
      setIdentityState(null)
      return
    }

    window.localStorage.removeItem(getStorageKey(shareToken))
    setIdentityState(null)
  }, [shareToken])

  const setIdentity = useCallback(
    (nextIdentity: EventIdentity) => {
      if (!shareToken || typeof window === 'undefined') {
        setIdentityState(nextIdentity)
        return
      }

      window.localStorage.setItem(getStorageKey(shareToken), JSON.stringify(nextIdentity))
      setIdentityState(nextIdentity)
    },
    [shareToken]
  )

  return {
    clearIdentity,
    identity,
    setIdentity,
  }
}
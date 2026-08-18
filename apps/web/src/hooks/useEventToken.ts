import { useContext, useEffect } from 'react'

import { eventTokenContext } from '../app/eventTokenContext'

const ADMIN_TOKEN_PATTERN = /^[a-f0-9]{64}$/i

function isAdminToken(value: string): boolean {
  return ADMIN_TOKEN_PATTERN.test(value)
}

function readAdminTokenFromFragment(shareToken: string): string | null {
  if (!shareToken || typeof window === 'undefined') {
    return null
  }

  const fragment = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash

  if (!fragment) {
    return null
  }

  const params = new URLSearchParams(fragment)
  const token = params.get('k')

  if (!token || !isAdminToken(token)) {
    return null
  }

  return token
}

/** Returns the event token for API calls, preferring organiser auth when it is available. */
export function useEventToken(shareToken: string, preferAdmin: boolean): string {
  const context = useContext(eventTokenContext)

  if (!context) {
    throw new Error('EventTokenContext is not available')
  }

  if (!shareToken) {
    return ''
  }

  if (preferAdmin) {
    const adminTokenFromFragment = readAdminTokenFromFragment(shareToken)

    if (adminTokenFromFragment) {
      return adminTokenFromFragment
    }
  }

  return context.getEventToken(shareToken, preferAdmin)
}

/** Returns the organiser token for the current event when one is available. */
export function useStoredAdminToken(shareToken: string): string | null {
  const context = useContext(eventTokenContext)

  if (!context) {
    throw new Error('EventTokenContext is not available')
  }

  if (!shareToken) {
    return null
  }

  const adminTokenFromFragment = readAdminTokenFromFragment(shareToken)

  if (adminTokenFromFragment) {
    return adminTokenFromFragment
  }

  return context.getAdminToken(shareToken)
}

/** Persists a valid organiser token from the URL fragment into the current browser session. */
export function useAdminTokenFromFragment(shareToken: string): void {
  const context = useContext(eventTokenContext)

  if (!context) {
    throw new Error('EventTokenContext is not available')
  }

  useEffect(() => {
    const token = readAdminTokenFromFragment(shareToken)

    if (!token) {
      return
    }

    context.setAdminToken(shareToken, token)
    window.history.replaceState(null, document.title, window.location.pathname + window.location.search)
  }, [context, shareToken])
}
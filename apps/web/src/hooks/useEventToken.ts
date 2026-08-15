import { useContext, useEffect } from 'react'

import { eventTokenContext } from '../app/eventTokenContext'

function isAdminToken(value: string): boolean {
  return /^[a-f0-9]{64}$/i.test(value)
}

export function useEventToken(shareToken: string, preferAdmin: boolean): string {
  const context = useContext(eventTokenContext)

  if (!context) {
    throw new Error('EventTokenContext is not available')
  }

  if (!shareToken) {
    return ''
  }

  return context.getEventToken(shareToken, preferAdmin)
}

export function useStoredAdminToken(shareToken: string): string | null {
  const context = useContext(eventTokenContext)

  if (!context) {
    throw new Error('EventTokenContext is not available')
  }

  if (!shareToken) {
    return null
  }

  return context.getAdminToken(shareToken)
}

export function useAdminTokenFromFragment(shareToken: string): void {
  const context = useContext(eventTokenContext)

  if (!context) {
    throw new Error('EventTokenContext is not available')
  }

  useEffect(() => {
    if (!shareToken) {
      return
    }

    const fragment = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash
    const params = new URLSearchParams(fragment)
    const token = params.get('k')

    if (!token || !isAdminToken(token)) {
      return
    }

    context.setAdminToken(shareToken, token)
    window.history.replaceState(null, document.title, window.location.pathname + window.location.search)
  }, [context, shareToken])
}
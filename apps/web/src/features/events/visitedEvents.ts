import type { Event } from '@listcollab/shared'

const VISITED_EVENTS_STORAGE_KEY = 'listcollab:visited-events'

export type VisitedEvent = {
  shareToken: string
  name: string
  lastVisitedAt: string
}

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

export function getVisitedEvents(): VisitedEvent[] {
  if (!isBrowser()) {
    return []
  }

  try {
    const storedValue = window.localStorage.getItem(VISITED_EVENTS_STORAGE_KEY)

    if (!storedValue) {
      return []
    }

    const parsedValue = JSON.parse(storedValue) as unknown

    if (!Array.isArray(parsedValue)) {
      return []
    }

    return parsedValue.filter((value): value is VisitedEvent => {
      if (typeof value !== 'object' || value === null) {
        return false
      }

      const candidate = value as Record<string, unknown>

      return (
        typeof candidate.shareToken === 'string' &&
        typeof candidate.name === 'string' &&
        typeof candidate.lastVisitedAt === 'string'
      )
    })
  } catch {
    return []
  }
}

export function recordVisitedEvent(event: Pick<Event, 'name' | 'shareToken'>): void {
  if (!isBrowser()) {
    return
  }

  const nextEntry: VisitedEvent = {
    shareToken: event.shareToken,
    name: event.name,
    lastVisitedAt: new Date().toISOString(),
  }

  const nextEntries = [
    nextEntry,
    ...getVisitedEvents().filter((visitedEvent) => visitedEvent.shareToken !== event.shareToken),
  ].slice(0, 10)

  window.localStorage.setItem(VISITED_EVENTS_STORAGE_KEY, JSON.stringify(nextEntries))
}
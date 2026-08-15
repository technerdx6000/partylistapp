import { afterEach, describe, expect, it, vi } from 'vitest'

import { getVisitedEvents, recordVisitedEvent } from './visitedEvents'

describe('visitedEvents helpers', () => {
  afterEach(() => {
    window.localStorage.clear()
    vi.useRealTimers()
  })

  it('returns an empty array when storage is missing or malformed', () => {
    window.localStorage.setItem('listcollab:visited-events', '{not json')

    expect(getVisitedEvents()).toEqual([])
  })

  it('records and deduplicates visited events', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-16T10:00:00.000Z'))

    recordVisitedEvent({ name: 'BBQ Night', shareToken: 'abcdefghij' })
    recordVisitedEvent({ name: 'Games Night', shareToken: 'zyxwvutsrq' })
    recordVisitedEvent({ name: 'BBQ Night Updated', shareToken: 'abcdefghij' })

    expect(getVisitedEvents()).toEqual([
      {
        shareToken: 'abcdefghij',
        name: 'BBQ Night Updated',
        lastVisitedAt: '2026-08-16T10:00:00.000Z',
      },
      {
        shareToken: 'zyxwvutsrq',
        name: 'Games Night',
        lastVisitedAt: '2026-08-16T10:00:00.000Z',
      },
    ])
  })
})
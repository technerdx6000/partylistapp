import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useEvent } from './useEvent'
import { EventTokenProvider } from '../app/EventTokenContext'

describe('useEvent', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loads the aggregate event payload with the shared query key', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          event: {
            id: 1,
            name: 'Camp Weekend',
            description: null,
            eventDate: null,
            location: null,
            shareToken: 'abcdefghij',
            createdAt: '2026-08-15T00:00:00.000Z',
            updatedAt: '2026-08-15T00:00:00.000Z',
          },
          participants: [],
          categories: [],
          items: [],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    )

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useEvent('abcdefghij', false), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          <EventTokenProvider>{children}</EventTokenProvider>
        </QueryClientProvider>
      ),
    })

    await waitFor(() => {
      expect(result.current.data?.event.name).toBe('Camp Weekend')
    })

    const cachedValue = queryClient.getQueryData<{ event: { shareToken: string } }>(['event', 'abcdefghij'])

    expect(cachedValue?.event.shareToken).toBe('abcdefghij')
  })
})
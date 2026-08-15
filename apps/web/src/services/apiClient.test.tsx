import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createApiClient, useApiClient } from './apiClient'
import { EventTokenProvider } from '../app/EventTokenContext'

describe('apiClient', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('parses successful aggregate event responses', async () => {
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

    const client = createApiClient('abcdefghij')
    const response = await client.getEvent('abcdefghij')

    expect(response.event.name).toBe('Camp Weekend')
  })

  it('throws typed API errors from error responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { code: 'EVENT_NOT_FOUND', message: 'Missing', requestId: 'req-4' },
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    )

    const client = createApiClient('abcdefghij')

    await expect(client.getEvent('abcdefghij')).rejects.toEqual(
      expect.objectContaining({ code: 'EVENT_NOT_FOUND', requestId: 'req-4' })
    )
  })

  it('throws INVALID_RESPONSE for malformed success payloads', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ nope: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    )

    const client = createApiClient('abcdefghij')

    await expect(client.getEvent('abcdefghij')).rejects.toEqual(
      expect.objectContaining({ code: 'INVALID_RESPONSE' })
    )
  })

  it('uses the current token context in useApiClient', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
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

    const { result } = renderHook(() => useApiClient('abcdefghij', false), {
      wrapper: ({ children }) => <EventTokenProvider>{children}</EventTokenProvider>,
    })

    await result.current.getEvent('abcdefghij')

    const typedCalls = fetchSpy.mock.calls as unknown as Array<[string, RequestInit | undefined]>
    const [url, requestInit] = typedCalls[0] ?? []
    const headers = new Headers(requestInit?.headers)

    expect(url).toBe('/api/events/abcdefghij')
    expect(headers.get('X-Event-Token')).toBe('abcdefghij')
  })
})
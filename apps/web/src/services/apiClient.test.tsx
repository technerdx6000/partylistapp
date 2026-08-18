import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createApiClient, useApiClient } from './apiClient'
import { EventTokenProvider } from '../app/EventTokenContext'

const eventResponse = {
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
}

const participantResponse = {
  id: 1,
  eventId: 1,
  name: 'Taylor',
  createdAt: '2026-08-15T00:00:00.000Z',
}

const categoryResponse = {
  id: 2,
  eventId: 1,
  name: 'Food',
  icon: '🍽️',
  sortOrder: 0,
  createdAt: '2026-08-15T00:00:00.000Z',
}

const itemResponse = {
  id: 3,
  eventId: 1,
  categoryId: 2,
  createdBy: null,
  name: 'Ice bags',
  description: null,
  quantityRequired: 4,
  status: 'open',
  createdAt: '2026-08-15T00:00:00.000Z',
  updatedAt: '2026-08-15T00:00:00.000Z',
  assignments: [],
  coverage: {
    required: 4,
    claimed: 0,
    remaining: 4,
    status: 'open',
  },
}

const assignmentResponse = {
  id: 4,
  itemId: 3,
  participantId: 1,
  quantity: 2,
  note: null,
  createdAt: '2026-08-15T00:00:00.000Z',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('apiClient', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    window.history.replaceState(null, document.title, '/')
  })

  it('parses successful aggregate event responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(eventResponse))

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
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(eventResponse))

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

  it('regression: uses the organiser token from the URL fragment for item creation on the first render', async () => {
    window.history.replaceState(null, document.title, '/e/abcdefghij/manage#k=' + 'a'.repeat(64))

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(itemResponse, 201))

    const { result } = renderHook(() => useApiClient('abcdefghij', true), {
      wrapper: ({ children }) => <EventTokenProvider>{children}</EventTokenProvider>,
    })

    await result.current.createItem({
      categoryId: 2,
      createdBy: null,
      description: null,
      name: 'Ice bags',
      quantityRequired: 4,
    })

    const typedCalls = fetchSpy.mock.calls as unknown as Array<[string, RequestInit | undefined]>
    const [url, requestInit] = typedCalls[0] ?? []
    const headers = new Headers(requestInit?.headers)

    expect(url).toBe('/api/items')
    expect(headers.get('X-Event-Token')).toBe('a'.repeat(64))
  })

  it('calls the remaining API client methods with validated payloads', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        jsonResponse(
          {
            ...eventResponse,
            event: {
              ...eventResponse.event,
              adminToken: 'b'.repeat(64),
            },
          },
          201
        )
      )
      .mockResolvedValueOnce(jsonResponse(participantResponse, 201))
      .mockResolvedValueOnce(jsonResponse(participantResponse))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(jsonResponse(categoryResponse, 201))
      .mockResolvedValueOnce(jsonResponse(categoryResponse))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(jsonResponse(itemResponse))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(jsonResponse(assignmentResponse, 201))
      .mockResolvedValueOnce(jsonResponse(assignmentResponse))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(jsonResponse(eventResponse))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))

    const client = createApiClient('abcdefghij')

    await expect(client.createEvent({ name: 'Camp Weekend' })).resolves.toEqual(
      expect.objectContaining({
        event: expect.objectContaining({ shareToken: 'abcdefghij', adminToken: 'b'.repeat(64) }),
      })
    )
    await expect(client.createParticipant({ name: 'Taylor' })).resolves.toEqual(participantResponse)
    await expect(client.updateParticipant(1, { name: 'Taylor' })).resolves.toEqual(participantResponse)
    await expect(client.deleteParticipant(1)).resolves.toBeUndefined()
    await expect(client.createCategory({ icon: '🍽️', name: 'Food', sortOrder: 0 })).resolves.toEqual(categoryResponse)
    await expect(client.updateCategory(2, { icon: '🍽️', name: 'Food', sortOrder: 0 })).resolves.toEqual(categoryResponse)
    await expect(client.deleteCategory(2)).resolves.toBeUndefined()
    await expect(client.updateItem(3, { categoryId: 2, description: null, name: 'Ice bags', quantityRequired: 4 })).resolves.toEqual(itemResponse)
    await expect(client.deleteItem(3)).resolves.toBeUndefined()
    await expect(client.claimItem(3, { note: null, participantId: 1, quantity: 2 })).resolves.toEqual(assignmentResponse)
    await expect(client.updateAssignment(4, { note: null, participantId: 1, quantity: 2 })).resolves.toEqual(assignmentResponse)
    await expect(client.deleteAssignment(4, { participantId: 1 })).resolves.toBeUndefined()
    await expect(client.updateEvent('abcdefghij', { description: null, eventDate: null, location: null, name: 'Camp Weekend' })).resolves.toEqual(eventResponse)
    await expect(client.deleteEvent('abcdefghij')).resolves.toBeUndefined()
  })
})
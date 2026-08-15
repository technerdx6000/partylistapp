import {
  AggregateEventResponseSchema,
  ApiErrorSchema,
  CreateEventRequestSchema,
  CreateEventResponseSchema,
  type AggregateEventResponse,
  type CreateEventRequest,
  type CreateEventResponse,
} from '@listcollab/shared'
import { useMemo } from 'react'

import { useEventToken } from '../hooks/useEventToken'

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly requestId: string
  ) {
    super(message)
    this.name = 'ApiClientError'
  }
}

type ApiClient = {
  createEvent: (input: CreateEventRequest) => Promise<CreateEventResponse>
  getEvent: (shareToken: string) => Promise<AggregateEventResponse>
}

type ApiRequestOptions<TResponse> = {
  endpoint: string
  eventToken?: string | null
  requestInit?: RequestInit
  responseSchema: {
    parse: (value: unknown) => TResponse
  }
}

async function readJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? ''

  if (!contentType.includes('application/json')) {
    return null
  }

  return response.json()
}

async function apiRequest<TResponse>({
  endpoint,
  eventToken,
  requestInit,
  responseSchema,
}: ApiRequestOptions<TResponse>): Promise<TResponse> {
  const headers = new Headers(requestInit?.headers)
  headers.set('Content-Type', 'application/json')

  if (eventToken) {
    headers.set('X-Event-Token', eventToken)
  }

  const response = await fetch(`/api${endpoint}`, {
    ...requestInit,
    headers,
  })

  const payload = await readJson(response)

  if (!response.ok) {
    const apiError = ApiErrorSchema.safeParse(payload)

    if (apiError.success) {
      throw new ApiClientError(
        apiError.data.error.message,
        apiError.data.error.code,
        apiError.data.error.requestId
      )
    }

    throw new ApiClientError('Something went wrong', 'INVALID_RESPONSE', 'unknown')
  }

  try {
    return responseSchema.parse(payload)
  } catch {
    throw new ApiClientError('The server returned an unexpected response', 'INVALID_RESPONSE', 'unknown')
  }
}

export function createApiClient(eventToken?: string | null): ApiClient {
  return {
    createEvent: (input) =>
      apiRequest({
        endpoint: '/events',
        requestInit: {
          method: 'POST',
          body: JSON.stringify(CreateEventRequestSchema.parse(input)),
        },
        responseSchema: CreateEventResponseSchema,
      }),
    getEvent: (shareToken) =>
      apiRequest({
        endpoint: `/events/${shareToken}`,
        eventToken: eventToken ?? shareToken,
        responseSchema: AggregateEventResponseSchema,
      }),
  }
}

export function useApiClient(shareToken?: string, preferAdmin = false): ApiClient {
  const eventToken = useEventToken(shareToken ?? '', preferAdmin)

  return useMemo(() => createApiClient(eventToken || null), [eventToken])
}
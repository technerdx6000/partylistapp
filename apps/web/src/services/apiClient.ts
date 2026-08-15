import {
  AggregateEventResponseSchema,
  ApiErrorSchema,
  CreateAssignmentRequestSchema,
  CreateEventRequestSchema,
  CreateItemRequestSchema,
  CreateParticipantRequestSchema,
  CreateEventResponseSchema,
  DeleteAssignmentRequestSchema,
  EventItemAssignmentSchema,
  EventItemWithAssignmentsSchema,
  EventParticipantSchema,
  EventCategorySchema,
  UpdateCategoryRequestSchema,
  UpdateAssignmentRequestSchema,
  UpdateEventRequestSchema,
  UpdateItemRequestSchema,
  type AggregateEventResponse,
  type CreateAssignmentRequest,
  type CreateEventRequest,
  type CreateEventResponse,
  type CreateItemRequest,
  type CreateParticipantRequest,
  type DeleteAssignmentRequest,
  type EventCategory,
  type EventItemAssignment,
  type EventItemWithAssignments,
  type EventParticipant,
  type UpdateAssignmentRequest,
  type UpdateCategoryRequest,
  type UpdateEventRequest,
  type UpdateItemRequest,
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
  claimItem: (itemId: number, input: CreateAssignmentRequest) => Promise<EventItemAssignment>
  createCategory: (input: { icon?: string | null; name: string; sortOrder?: number }) => Promise<EventCategory>
  createEvent: (input: CreateEventRequest) => Promise<CreateEventResponse>
  createItem: (input: CreateItemRequest) => Promise<EventItemWithAssignments>
  createParticipant: (input: CreateParticipantRequest) => Promise<EventParticipant>
  deleteAssignment: (assignmentId: number, input: DeleteAssignmentRequest) => Promise<void>
  deleteCategory: (categoryId: number) => Promise<void>
  deleteEvent: (shareToken: string) => Promise<void>
  deleteItem: (itemId: number) => Promise<void>
  deleteParticipant: (participantId: number) => Promise<void>
  getEvent: (shareToken: string) => Promise<AggregateEventResponse>
  updateAssignment: (assignmentId: number, input: UpdateAssignmentRequest) => Promise<EventItemAssignment>
  updateCategory: (categoryId: number, input: UpdateCategoryRequest) => Promise<EventCategory>
  updateEvent: (shareToken: string, input: UpdateEventRequest) => Promise<AggregateEventResponse>
  updateItem: (itemId: number, input: UpdateItemRequest) => Promise<EventItemWithAssignments>
  updateParticipant: (participantId: number, input: { name: string }) => Promise<EventParticipant>
}

type ApiRequestOptions<TResponse> = {
  endpoint: string
  eventToken?: string | null | undefined
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
    createParticipant: (input) =>
      apiRequest({
        endpoint: '/participants',
        eventToken,
        requestInit: {
          method: 'POST',
          body: JSON.stringify(CreateParticipantRequestSchema.parse(input)),
        },
        responseSchema: EventParticipantSchema,
      }),
    updateParticipant: (participantId, input) =>
      apiRequest({
        endpoint: `/participants/${participantId}`,
        eventToken,
        requestInit: {
          method: 'PATCH',
          body: JSON.stringify(CreateParticipantRequestSchema.parse(input)),
        },
        responseSchema: EventParticipantSchema,
      }),
    deleteParticipant: (participantId) =>
      apiRequest({
        endpoint: `/participants/${participantId}`,
        eventToken,
        requestInit: { method: 'DELETE' },
        responseSchema: { parse: () => undefined },
      }),
    createCategory: (input) =>
      apiRequest({
        endpoint: '/categories',
        eventToken,
        requestInit: { method: 'POST', body: JSON.stringify(input) },
        responseSchema: EventCategorySchema,
      }),
    updateCategory: (categoryId, input) =>
      apiRequest({
        endpoint: `/categories/${categoryId}`,
        eventToken,
        requestInit: { method: 'PATCH', body: JSON.stringify(UpdateCategoryRequestSchema.parse(input)) },
        responseSchema: EventCategorySchema,
      }),
    deleteCategory: (categoryId) =>
      apiRequest({
        endpoint: `/categories/${categoryId}`,
        eventToken,
        requestInit: { method: 'DELETE' },
        responseSchema: { parse: () => undefined },
      }),
    createItem: (input) =>
      apiRequest({
        endpoint: '/items',
        eventToken,
        requestInit: { method: 'POST', body: JSON.stringify(CreateItemRequestSchema.parse(input)) },
        responseSchema: EventItemWithAssignmentsSchema,
      }),
    updateItem: (itemId, input) =>
      apiRequest({
        endpoint: `/items/${itemId}`,
        eventToken,
        requestInit: { method: 'PATCH', body: JSON.stringify(UpdateItemRequestSchema.parse(input)) },
        responseSchema: EventItemWithAssignmentsSchema,
      }),
    deleteItem: (itemId) =>
      apiRequest({
        endpoint: `/items/${itemId}`,
        eventToken,
        requestInit: { method: 'DELETE' },
        responseSchema: { parse: () => undefined },
      }),
    claimItem: (itemId, input) =>
      apiRequest({
        endpoint: `/items/${itemId}/assignments`,
        eventToken,
        requestInit: { method: 'POST', body: JSON.stringify(CreateAssignmentRequestSchema.parse(input)) },
        responseSchema: EventItemAssignmentSchema,
      }),
    updateAssignment: (assignmentId, input) =>
      apiRequest({
        endpoint: `/assignments/${assignmentId}`,
        eventToken,
        requestInit: { method: 'PATCH', body: JSON.stringify(UpdateAssignmentRequestSchema.parse(input)) },
        responseSchema: EventItemAssignmentSchema,
      }),
    deleteAssignment: (assignmentId, input) =>
      apiRequest({
        endpoint: `/assignments/${assignmentId}`,
        eventToken,
        requestInit: { method: 'DELETE', body: JSON.stringify(DeleteAssignmentRequestSchema.parse(input)) },
        responseSchema: { parse: () => undefined },
      }),
    updateEvent: (shareToken, input) =>
      apiRequest({
        endpoint: `/events/${shareToken}`,
        eventToken,
        requestInit: { method: 'PATCH', body: JSON.stringify(UpdateEventRequestSchema.parse(input)) },
        responseSchema: AggregateEventResponseSchema,
      }),
    deleteEvent: (shareToken) =>
      apiRequest({
        endpoint: `/events/${shareToken}`,
        eventToken,
        requestInit: { method: 'DELETE' },
        responseSchema: { parse: () => undefined },
      }),
  }
}

export function useApiClient(shareToken?: string, preferAdmin = false): ApiClient {
  const eventToken = useEventToken(shareToken ?? '', preferAdmin)

  return useMemo(() => createApiClient(eventToken || null), [eventToken])
}
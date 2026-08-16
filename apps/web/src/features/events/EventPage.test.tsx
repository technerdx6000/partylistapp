import type { AggregateEventResponse } from '@listcollab/shared'
import { fireEvent, screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import EventPage from './EventPage'
import { recordVisitedEvent } from './visitedEvents'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { useEvent } from '../../hooks/useEvent'
import { useStoredAdminToken } from '../../hooks/useEventToken'
import { ApiClientError } from '../../services/apiClient'

vi.mock('../../hooks/useEvent', () => ({
  useEvent: vi.fn(),
}))

vi.mock('../../hooks/useEventToken', async () => {
  const actual = await vi.importActual<typeof import('../../hooks/useEventToken')>('../../hooks/useEventToken')

  return {
    ...actual,
    useStoredAdminToken: vi.fn(),
  }
})

vi.mock('./visitedEvents', () => ({
  recordVisitedEvent: vi.fn(),
}))

function buildAggregateResponse(): AggregateEventResponse {
  return {
    event: {
      id: 1,
      name: 'Camp Weekend',
      description: 'Bring the essentials',
      eventDate: '2026-08-20',
      location: 'Lakeside',
      shareToken: 'abcdefghij',
      createdAt: '2026-08-15T00:00:00.000Z',
      updatedAt: '2026-08-15T00:00:00.000Z',
    },
    participants: [
      { id: 1, eventId: 1, name: 'Taylor', createdAt: '2026-08-15T00:00:00.000Z' },
      { id: 2, eventId: 1, name: 'Jordan', createdAt: '2026-08-15T00:00:00.000Z' },
    ],
    categories: [
      { id: 1, eventId: 1, name: 'Food', icon: '🍽️', sortOrder: 0, createdAt: '2026-08-15T00:00:00.000Z' },
    ],
    items: [
      {
        id: 1,
        eventId: 1,
        categoryId: 1,
        name: 'Bread Rolls',
        description: null,
        quantityRequired: 4,
        status: 'open',
        createdBy: 1,
        createdAt: '2026-08-15T00:00:00.000Z',
        updatedAt: '2026-08-15T00:00:00.000Z',
        assignments: [{ id: 1, itemId: 1, participantId: 1, quantity: 2, note: null, createdAt: '2026-08-15T00:00:00.000Z' }],
        coverage: { claimed: 2, required: 4, remaining: 2, status: 'open' },
      },
      {
        id: 2,
        eventId: 1,
        categoryId: 1,
        name: 'Napkins',
        description: null,
        quantityRequired: 2,
        status: 'open',
        createdBy: 2,
        createdAt: '2026-08-15T00:00:00.000Z',
        updatedAt: '2026-08-15T00:00:00.000Z',
        assignments: [{ id: 2, itemId: 2, participantId: 2, quantity: 1, note: null, createdAt: '2026-08-15T00:00:00.000Z' }],
        coverage: { claimed: 1, required: 2, remaining: 1, status: 'open' },
      },
    ],
  }
}

const useEventMock = vi.mocked(useEvent)
const useStoredAdminTokenMock = vi.mocked(useStoredAdminToken)
const recordVisitedEventMock = vi.mocked(recordVisitedEvent)

function buildUseEventResult(
  overrides: {
    data?: AggregateEventResponse | undefined
    error?: ApiClientError | null | undefined
    isLoading?: boolean | undefined
    refetch?: ReturnType<typeof vi.fn>
  }
): ReturnType<typeof useEvent> {
  return {
    data: buildAggregateResponse(),
    error: null,
    isLoading: false,
    refetch: vi.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useEvent>
}

function renderEventPage(route = '/e/abcdefghij', manageMode = false) {
  return renderWithProviders(
    <Routes>
      <Route path="/e/:shareToken" element={<EventPage manageMode={manageMode} />} />
    </Routes>,
    { route }
  )
}

describe('EventPage', () => {
  beforeEach(() => {
    useStoredAdminTokenMock.mockReturnValue(null)
    useEventMock.mockReturnValue(buildUseEventResult({}))
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('records the visited event and filters by participant names', () => {
    renderEventPage()

    expect(recordVisitedEventMock).toHaveBeenCalledWith(expect.objectContaining({ name: 'Camp Weekend' }))
    expect(document.title).toBe('Camp Weekend | ListCollab')
    fireEvent.change(screen.getByLabelText('Search items or people'), { target: { value: 'Taylor' } })

    expect(screen.getByText('Bread Rolls')).toBeInTheDocument()
    expect(screen.queryByText('Napkins')).not.toBeInTheDocument()
  })

  it('renders the invalid-link state for invalid event tokens', () => {
    useEventMock.mockReturnValue(buildUseEventResult({
      data: undefined,
      error: new ApiClientError('Not found', 'EVENT_NOT_FOUND', 'req-1'),
      isLoading: false,
    }))

    renderEventPage()

    expect(screen.getByText("This event link isn't valid.")).toBeInTheDocument()
    expect(document.title).toBe('Event unavailable | ListCollab')
  })

  it('renders the generic error state with a retry action', () => {
    const refetch = vi.fn()
    useEventMock.mockReturnValue(buildUseEventResult({
      data: undefined,
      error: new ApiClientError('Failed', 'INTERNAL_ERROR', 'req-2'),
      isLoading: false,
      refetch,
    }))

    renderEventPage()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

    expect(screen.getByText(/Request ID: req-2/)).toBeInTheDocument()
    expect(document.title).toBe('Unable to load event | ListCollab')
    expect(refetch).toHaveBeenCalled()
  })

  it('renders the empty items state when the event has no items', () => {
    useEventMock.mockReturnValue(buildUseEventResult({
      data: { ...buildAggregateResponse(), items: [] },
      error: null,
      isLoading: false,
    }))

    renderEventPage()

    expect(screen.getByText('No items yet')).toBeInTheDocument()
    expect(screen.getByText('This event does not have any items yet. Ask the organiser to add a requirement or add your own contribution.')).toBeInTheDocument()
  })

  it('renders the manage-view empty participants state', () => {
    useStoredAdminTokenMock.mockReturnValue('a'.repeat(64))
    useEventMock.mockReturnValue(buildUseEventResult({
      data: {
        ...buildAggregateResponse(),
        items: [],
        participants: [],
      },
      error: null,
      isLoading: false,
    }))

    renderEventPage('/e/abcdefghij', true)

    expect(screen.getByText('No participants yet. Claims will appear here as people identify themselves.')).toBeInTheDocument()
  })

  it('renders the invalid-link fallback when no event data resolves and there is no API error', () => {
    useEventMock.mockReturnValue(buildUseEventResult({
      data: undefined,
      error: null,
      isLoading: false,
    }))

    renderEventPage()

    expect(screen.getByRole('heading', { name: "This event link isn't valid." })).toBeInTheDocument()
  })

  it('renders the invalid-link state when no share token route param exists', () => {
    renderWithProviders(
      <Routes>
        <Route path="/" element={<EventPage manageMode={false} />} />
      </Routes>,
      { route: '/' }
    )

    expect(screen.getByRole('heading', { name: "This event link isn't valid." })).toBeInTheDocument()
  })

  it('renders the no-match state when the search filters out every item', () => {
    renderEventPage()

    fireEvent.change(screen.getByLabelText('Search items or people'), { target: { value: 'zzz' } })

    expect(screen.getByText('No items match that search.')).toBeInTheDocument()
  })
})
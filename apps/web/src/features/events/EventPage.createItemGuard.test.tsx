import type { AggregateEventResponse, CreateItemRequest } from '@listcollab/shared'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import EventPage from './EventPage'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { useEvent } from '../../hooks/useEvent'
import { useEventIdentity } from '../../hooks/useEventIdentity'
import { useStoredAdminToken } from '../../hooks/useEventToken'
import { useApiClient } from '../../services/apiClient'

vi.mock('../../services/apiClient', async () => {
  const actual = await vi.importActual<typeof import('../../services/apiClient')>('../../services/apiClient')

  return {
    ...actual,
    useApiClient: vi.fn(),
  }
})

vi.mock('../../hooks/useEventToken', async () => {
  const actual = await vi.importActual<typeof import('../../hooks/useEventToken')>('../../hooks/useEventToken')

  return {
    ...actual,
    useStoredAdminToken: vi.fn(),
  }
})

vi.mock('../../hooks/useEventIdentity', async () => {
  const actual = await vi.importActual<typeof import('../../hooks/useEventIdentity')>('../../hooks/useEventIdentity')

  return {
    ...actual,
    useEventIdentity: vi.fn(),
  }
})

vi.mock('../../hooks/useEvent', async () => {
  const actual = await vi.importActual<typeof import('../../hooks/useEvent')>('../../hooks/useEvent')

  return {
    ...actual,
    useEvent: vi.fn(),
  }
})

vi.mock('../items/ItemForm', () => ({
  ItemForm: ({ isOpen, onCreate }: { isOpen: boolean; onCreate: (payload: CreateItemRequest) => Promise<void> }) =>
    isOpen ? (
      <div>
        <button onClick={() => void onCreate({ categoryId: null, createdBy: null, description: null, name: 'Ice bag', quantityRequired: null })} type="button">
          Trigger invalid create
        </button>
      </div>
    ) : null,
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
    categories: [{ id: 1, eventId: 1, name: 'Food', icon: '🍽️', sortOrder: 0, createdAt: '2026-08-15T00:00:00.000Z' }],
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
        assignments: [],
        coverage: { claimed: 0, required: 4, remaining: 4, status: 'open' },
      },
    ],
  }
}

const useApiClientMock = vi.mocked(useApiClient)
const useEventMock = vi.mocked(useEvent)
const useEventIdentityMock = vi.mocked(useEventIdentity)
const useStoredAdminTokenMock = vi.mocked(useStoredAdminToken)

function buildApiClient() {
  return {
    claimItem: vi.fn(),
    createCategory: vi.fn(),
    createEvent: vi.fn(),
    createItem: vi.fn(),
    createParticipant: vi.fn(),
    deleteAssignment: vi.fn(),
    deleteCategory: vi.fn(),
    deleteEvent: vi.fn(),
    deleteItem: vi.fn(),
    deleteParticipant: vi.fn(),
    getEvent: vi.fn(),
    updateAssignment: vi.fn(),
    updateCategory: vi.fn(),
    updateEvent: vi.fn(),
    updateItem: vi.fn(),
    updateParticipant: vi.fn(),
  }
}

function renderEventPage() {
  return renderWithProviders(
    <Routes>
      <Route element={<EventPage manageMode={false} />} path="/e/:shareToken" />
    </Routes>,
    { route: '/e/abcdefghij' }
  )
}

describe('EventPage create-item guard', () => {
  beforeEach(() => {
    useStoredAdminTokenMock.mockReturnValue(null)
    useEventMock.mockReturnValue({
      data: buildAggregateResponse(),
      error: null,
      isLoading: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useEvent>)
    useEventIdentityMock.mockReturnValue({
      clearIdentity: vi.fn(),
      identity: { displayName: 'Jordan', participantId: 2 },
      setIdentity: vi.fn(),
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('re-prompts for identity instead of calling createItem when a guest create payload reaches the page without createdBy', async () => {
    const apiClient = buildApiClient()
    useApiClientMock.mockReturnValue(apiClient)

    renderEventPage()

    fireEvent.click(screen.getByRole('button', { name: 'Add your contribution' }))
    fireEvent.click(screen.getByRole('button', { name: 'Trigger invalid create' }))

    await screen.findByRole('heading', { name: 'Who are you?' })
    expect(apiClient.createItem).not.toHaveBeenCalled()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Taylor' })).toBeInTheDocument()
    })
  })
})
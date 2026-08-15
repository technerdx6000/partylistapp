import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import CreateEventPage from './CreateEventPage'
import { recordVisitedEvent } from './visitedEvents'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { ApiClientError } from '../../services/apiClient'

const createEventMock = vi.fn()
const navigateMock = vi.fn()

vi.mock('../../services/apiClient', async () => {
  const actual = await vi.importActual<typeof import('../../services/apiClient')>('../../services/apiClient')

  return {
    ...actual,
    createApiClient: () => ({
      createEvent: createEventMock,
      getEvent: vi.fn(),
    }),
  }
})

vi.mock('./visitedEvents', () => ({
  recordVisitedEvent: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')

  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

const recordVisitedEventMock = vi.mocked(recordVisitedEvent)

function renderCreateEventPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/create" element={<CreateEventPage />} />
    </Routes>,
    { route: '/create' }
  )
}

describe('CreateEventPage', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('navigates to the manage route after a successful create', async () => {
    const user = userEvent.setup()
    createEventMock.mockResolvedValue({
      event: {
        id: 1,
        name: 'Camp Weekend',
        description: null,
        eventDate: null,
        location: null,
        shareToken: 'abcdefghij',
        adminToken: 'a'.repeat(64),
        createdAt: '2026-08-15T00:00:00.000Z',
        updatedAt: '2026-08-15T00:00:00.000Z',
      },
      participants: [],
      categories: [],
      items: [],
    })

    renderCreateEventPage()
    await user.type(screen.getByLabelText(/Event name/i), 'Camp Weekend')
    await user.click(screen.getByRole('button', { name: 'Create event' }))

    await waitFor(() => {
      expect(recordVisitedEventMock).toHaveBeenCalledWith(expect.objectContaining({ name: 'Camp Weekend' }))
      expect(navigateMock).toHaveBeenCalledWith(`/e/abcdefghij/manage#k=${'a'.repeat(64)}`)
    })
  }, 10000)

  it('renders request-id aware errors from the API client', async () => {
    const user = userEvent.setup()
    createEventMock.mockRejectedValue(new ApiClientError('No thanks', 'INTERNAL_ERROR', 'req-7'))

    renderCreateEventPage()
    await user.type(screen.getByLabelText(/Event name/i), 'Camp Weekend')
    await user.click(screen.getByRole('button', { name: 'Create event' }))

    expect(await screen.findByText(/Request ID: req-7/)).toBeInTheDocument()
  })
})
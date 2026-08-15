import type { AggregateEventResponse } from '@listcollab/shared'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import EventPage from './EventPage'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { useStoredAdminToken } from '../../hooks/useEventToken'
import { ApiClientError, useApiClient } from '../../services/apiClient'

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

function createDeferred<T>() {
  let resolve: (value: T | PromiseLike<T>) => void = () => undefined
  let reject: (reason?: unknown) => void = () => undefined
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve
    reject = nextReject
  })

  return { promise, reject, resolve }
}

const useApiClientMock = vi.mocked(useApiClient)
const useStoredAdminTokenMock = vi.mocked(useStoredAdminToken)
const clipboardWriteTextMock = vi.fn<(...args: [string]) => Promise<void>>()

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
    getEvent: vi.fn().mockResolvedValue(buildAggregateResponse()),
    updateAssignment: vi.fn(),
    updateCategory: vi.fn(),
    updateEvent: vi.fn(),
    updateItem: vi.fn(),
    updateParticipant: vi.fn(),
  }
}

const createParticipantResponse = {
  id: 5,
  eventId: 1,
  name: 'Avery',
  createdAt: '2026-08-15T00:00:00.000Z',
}

function renderEventPage(route = '/e/abcdefghij', manageMode = false) {
  return renderWithProviders(
    <Routes>
      <Route path="/e/:shareToken" element={<EventPage manageMode={manageMode} />} />
    </Routes>,
    { route }
  )
}

describe('EventPage collaboration', () => {
  beforeEach(() => {
    window.localStorage.clear()
    useStoredAdminTokenMock.mockReturnValue(null)
    clipboardWriteTextMock.mockReset()
    clipboardWriteTextMock.mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: clipboardWriteTextMock },
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('prompts for identity on the first claim action instead of page load', async () => {
    useApiClientMock.mockReturnValue(buildApiClient())
    renderEventPage()

    await screen.findByRole('heading', { name: 'Camp Weekend' })
    expect(screen.queryByRole('heading', { name: 'Who are you?' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit event' })).not.toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: 'I will bring this' })[0] as HTMLButtonElement)

    await screen.findByRole('heading', { name: 'Who are you?' })
    fireEvent.click(screen.getByRole('button', { name: 'Jordan' }))

    await screen.findByRole('heading', { name: 'Claim item' })
  }, 10000)

  it('copies the guest share URL even in organiser mode', async () => {
    useStoredAdminTokenMock.mockReturnValue('a'.repeat(64))
    useApiClientMock.mockReturnValue(buildApiClient())
    renderEventPage('/e/abcdefghij', true)

    await screen.findByRole('heading', { name: 'Camp Weekend' })
    fireEvent.click(screen.getByRole('button', { name: 'Copy share link' }))

    await waitFor(() => {
      expect(clipboardWriteTextMock).toHaveBeenCalledWith(`${window.location.origin}/e/abcdefghij`)
    })

    expect(screen.getByDisplayValue(`${window.location.origin}/e/abcdefghij/manage#k=${'a'.repeat(64)}`)).toBeInTheDocument()
  })

  it('uses the Web Share API when it is available', async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', { configurable: true, value: shareMock })
    useApiClientMock.mockReturnValue(buildApiClient())

    renderEventPage()

    await screen.findByRole('heading', { name: 'Camp Weekend' })
    fireEvent.click(screen.getByRole('button', { name: 'Share event' }))

    await waitFor(() => {
      expect(shareMock).toHaveBeenCalledWith({
        title: 'Camp Weekend',
        url: `${window.location.origin}/e/abcdefghij`,
      })
    })

    expect(screen.getByText('Link ready to share.')).toBeInTheDocument()
  })

  it('saves a new claim successfully for an identified participant', async () => {
    window.localStorage.setItem(
      'listcollab:identity:abcdefghij',
      JSON.stringify({ displayName: 'Jordan', participantId: 2 })
    )

    const apiClient = buildApiClient()
    apiClient.claimItem.mockResolvedValue({
      id: 21,
      itemId: 1,
      participantId: 2,
      quantity: 1,
      note: 'Ready',
      createdAt: '2026-08-15T00:00:00.000Z',
    })
    useApiClientMock.mockReturnValue(apiClient)

    renderEventPage()

    await screen.findByRole('heading', { name: 'Camp Weekend' })
    fireEvent.click(screen.getAllByRole('button', { name: 'I will bring this' })[0] as HTMLButtonElement)
    await screen.findByRole('heading', { name: 'Claim item' })

    fireEvent.change(screen.getByLabelText('Optional note'), { target: { value: ' Ready ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Claim item' }))

    await waitFor(() => {
      expect(apiClient.claimItem).toHaveBeenCalledWith(1, { note: 'Ready', participantId: 2, quantity: 2 })
    })
    expect(screen.getByText('Claim saved.')).toBeInTheDocument()
  })

  it('optimistically updates a claim and rolls it back when the server rejects the claim', async () => {
    window.localStorage.setItem(
      'listcollab:identity:abcdefghij',
      JSON.stringify({ displayName: 'Jordan', participantId: 2 })
    )

    const apiClient = buildApiClient()
    const deferredClaim = createDeferred<{ id: number; itemId: number; participantId: number; quantity: number; note: string | null; createdAt: string }>()
    apiClient.claimItem.mockReturnValue(deferredClaim.promise)
    useApiClientMock.mockReturnValue(apiClient)

    renderEventPage()

    await screen.findByRole('heading', { name: 'Camp Weekend' })

    fireEvent.click(screen.getAllByRole('button', { name: 'I will bring this' })[0] as HTMLButtonElement)
    await screen.findByRole('heading', { name: 'Claim item' })

    fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: '1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Claim item' }))

    await waitFor(() => {
      expect(screen.getByText('3 / 4 covered')).toBeInTheDocument()
    })

    deferredClaim.reject(new ApiClientError('Too late', 'OVER_CLAIM', 'req-9'))

    await waitFor(() => {
      expect(screen.getByText('Someone else claimed that amount first. The list has been refreshed.')).toBeInTheDocument()
    })
    await waitFor(() => {
      expect(screen.getByText('2 / 4 covered')).toBeInTheDocument()
    })
  })

  it('shows a generic error when saving a claim fails for reasons other than over-claim', async () => {
    window.localStorage.setItem(
      'listcollab:identity:abcdefghij',
      JSON.stringify({ displayName: 'Jordan', participantId: 2 })
    )

    const apiClient = buildApiClient()
    apiClient.claimItem.mockRejectedValue(new ApiClientError('Nope', 'INTERNAL_ERROR', 'req-5'))
    useApiClientMock.mockReturnValue(apiClient)

    renderEventPage()

    await screen.findByRole('heading', { name: 'Camp Weekend' })
    fireEvent.click(screen.getAllByRole('button', { name: 'I will bring this' })[0] as HTMLButtonElement)
    await screen.findByRole('heading', { name: 'Claim item' })
    fireEvent.click(screen.getByRole('button', { name: 'Claim item' }))

    await waitFor(() => {
      expect(screen.getByText('We could not save that claim.')).toBeInTheDocument()
    })
  })

  it('creates an identity on demand and auto-claims a guest contribution', async () => {
    const apiClient = buildApiClient()
    apiClient.createParticipant.mockResolvedValue(createParticipantResponse)
    apiClient.createItem.mockResolvedValue({
      id: 9,
      eventId: 1,
      categoryId: null,
      name: 'Ice bag',
      description: null,
      quantityRequired: null,
      status: 'open',
      createdBy: 5,
      createdAt: '2026-08-15T00:00:00.000Z',
      updatedAt: '2026-08-15T00:00:00.000Z',
      assignments: [],
      coverage: { claimed: 0, required: null, remaining: null, status: 'open' },
    })
    apiClient.claimItem.mockResolvedValue({
      id: 91,
      itemId: 9,
      participantId: 5,
      quantity: 1,
      note: null,
      createdAt: '2026-08-15T00:00:00.000Z',
    })
    useApiClientMock.mockReturnValue(apiClient)

    renderEventPage()

    await screen.findByRole('heading', { name: 'Camp Weekend' })
    fireEvent.click(screen.getByRole('button', { name: 'Add your contribution' }))

    await screen.findByRole('heading', { name: 'Who are you?' })
    fireEvent.change(screen.getByLabelText('Add your name'), { target: { value: ' Avery ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    await screen.findByRole('heading', { name: 'Add your contribution' })
    fireEvent.change(screen.getByLabelText('Item name'), { target: { value: 'Ice bag' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(apiClient.createParticipant).toHaveBeenCalledWith({ name: 'Avery' })
    })
    await waitFor(() => {
      expect(apiClient.createItem).toHaveBeenCalledWith({
        categoryId: null,
        createdBy: 5,
        description: null,
        name: 'Ice bag',
        quantityRequired: null,
      })
    })
    await waitFor(() => {
      expect(apiClient.claimItem).toHaveBeenCalledWith(9, { participantId: 5, quantity: 1 })
    })
  }, 10000)

  it('lets a participant adjust their own claim', async () => {
    window.localStorage.setItem(
      'listcollab:identity:abcdefghij',
      JSON.stringify({ displayName: 'Jordan', participantId: 2 })
    )

    const apiClient = buildApiClient()
    apiClient.updateAssignment.mockResolvedValue({
      id: 2,
      itemId: 2,
      participantId: 2,
      quantity: 2,
      note: null,
      createdAt: '2026-08-15T00:00:00.000Z',
    })
    apiClient.deleteAssignment.mockResolvedValue(undefined)
    useApiClientMock.mockReturnValue(apiClient)
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    renderEventPage()

    await screen.findByRole('heading', { name: 'Camp Weekend' })
    fireEvent.click(screen.getByRole('button', { name: 'Jordan ×1' }))
    await screen.findByRole('heading', { name: 'Adjust claim' })

    fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Update claim' }))

    await waitFor(() => {
      expect(apiClient.updateAssignment).toHaveBeenCalledWith(2, { note: null, participantId: 2, quantity: 2 })
    })
  })

  it('lets a participant remove their own claim', async () => {
    window.localStorage.setItem(
      'listcollab:identity:abcdefghij',
      JSON.stringify({ displayName: 'Jordan', participantId: 2 })
    )

    const apiClient = buildApiClient()
    apiClient.deleteAssignment.mockResolvedValue(undefined)
    useApiClientMock.mockReturnValue(apiClient)
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    renderEventPage()

    await screen.findByRole('heading', { name: 'Camp Weekend' })
    fireEvent.click(screen.getByRole('button', { name: 'Jordan ×1' }))
    await screen.findByRole('heading', { name: 'Adjust claim' })

    fireEvent.click(screen.getByRole('button', { name: 'Remove claim' }))

    await waitFor(() => {
      expect(apiClient.deleteAssignment).toHaveBeenCalledWith(2, { participantId: 2 })
    })
  }, 10000)

  it('shows a generic error when removing a claim fails', async () => {
    window.localStorage.setItem(
      'listcollab:identity:abcdefghij',
      JSON.stringify({ displayName: 'Jordan', participantId: 2 })
    )

    const apiClient = buildApiClient()
    apiClient.deleteAssignment.mockRejectedValue(new ApiClientError('Nope', 'INTERNAL_ERROR', 'req-6'))
    useApiClientMock.mockReturnValue(apiClient)
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    renderEventPage()

    await screen.findByRole('heading', { name: 'Camp Weekend' })
    fireEvent.click(screen.getByRole('button', { name: 'Jordan ×1' }))
    await screen.findByRole('heading', { name: 'Adjust claim' })
    fireEvent.click(screen.getByRole('button', { name: 'Remove claim' }))

    await waitFor(() => {
      expect(screen.getByText('We could not remove that claim.')).toBeInTheDocument()
    })
  })

  it('opens the edit form and updates an item in organiser mode', async () => {
    const apiClient = buildApiClient()
    apiClient.updateItem.mockResolvedValue({
      id: 1,
      eventId: 1,
      categoryId: 1,
      name: 'Bread rolls updated',
      description: null,
      quantityRequired: 5,
      status: 'open',
      createdBy: 1,
      createdAt: '2026-08-15T00:00:00.000Z',
      updatedAt: '2026-08-15T00:00:00.000Z',
      assignments: [{ id: 1, itemId: 1, participantId: 1, quantity: 2, note: null, createdAt: '2026-08-15T00:00:00.000Z' }],
      coverage: { claimed: 2, required: 5, remaining: 3, status: 'open' },
    })
    useStoredAdminTokenMock.mockReturnValue('a'.repeat(64))
    useApiClientMock.mockReturnValue(apiClient)

    renderEventPage('/e/abcdefghij', true)

    await screen.findByRole('heading', { name: 'Camp Weekend' })
    fireEvent.click(screen.getByLabelText('Edit Bread Rolls'))
    await screen.findByRole('heading', { name: 'Edit item' })

    fireEvent.change(screen.getByLabelText('Item name'), { target: { value: 'Bread rolls updated' } })
    fireEvent.change(screen.getByLabelText('Quantity needed'), { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(apiClient.updateItem).toHaveBeenCalledWith(1, expect.objectContaining({ name: 'Bread rolls updated', quantityRequired: 5 }))
    })
    expect(screen.getByText('Item updated.')).toBeInTheDocument()
  }, 10000)

  it('supports organiser structural actions and warns before deleting the event', async () => {
    const apiClient = buildApiClient()
    apiClient.updateEvent.mockResolvedValue(buildAggregateResponse())
    apiClient.createCategory.mockResolvedValue({
      id: 4,
      eventId: 1,
      name: 'Dessert',
      icon: null,
      sortOrder: 1,
      createdAt: '2026-08-15T00:00:00.000Z',
    })
    apiClient.updateCategory.mockResolvedValue({
      id: 1,
      eventId: 1,
      name: 'Meals',
      icon: '🍽️',
      sortOrder: 0,
      createdAt: '2026-08-15T00:00:00.000Z',
    })
    apiClient.deleteParticipant.mockResolvedValue(undefined)
    apiClient.deleteItem.mockResolvedValue(undefined)
    apiClient.deleteCategory.mockResolvedValue(undefined)
    apiClient.deleteEvent.mockResolvedValue(undefined)
    useStoredAdminTokenMock.mockReturnValue('a'.repeat(64))
    useApiClientMock.mockReturnValue(apiClient)

    const promptMock = vi
      .spyOn(window, 'prompt')
      .mockReturnValueOnce('Camp Weekend Updated')
      .mockReturnValueOnce('Dessert')
      .mockReturnValueOnce('Meals')
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    renderEventPage('/e/abcdefghij', true)

    await screen.findByRole('heading', { name: 'Camp Weekend' })
    fireEvent.click(screen.getByRole('button', { name: 'Edit event' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add category' }))
    fireEvent.click(screen.getByLabelText('Edit Food'))
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0] as HTMLButtonElement)
    fireEvent.click(screen.getByLabelText('Delete Bread Rolls'))
    fireEvent.click(screen.getByLabelText('Delete Food'))

    await waitFor(() => {
      expect(promptMock).toHaveBeenNthCalledWith(1, 'Event name', 'Camp Weekend')
      expect(apiClient.updateEvent).toHaveBeenCalledWith('abcdefghij', expect.objectContaining({ name: 'Camp Weekend Updated' }))
      expect(apiClient.createCategory).toHaveBeenCalledWith({ name: 'Dessert', sortOrder: 1 })
      expect(apiClient.updateCategory).toHaveBeenCalledWith(1, { name: 'Meals' })
      expect(apiClient.deleteParticipant).toHaveBeenCalledWith(1)
      expect(apiClient.deleteItem).toHaveBeenCalledWith(1)
      expect(apiClient.deleteCategory).toHaveBeenCalledWith(1)
    })
  }, 10000)

  it('does not run organiser mutations when prompts or confirmations are cancelled', async () => {
    const apiClient = buildApiClient()
    useStoredAdminTokenMock.mockReturnValue('a'.repeat(64))
    useApiClientMock.mockReturnValue(apiClient)

    vi.spyOn(window, 'prompt').mockReturnValue('   ')
    vi.spyOn(window, 'confirm').mockReturnValue(false)

    renderEventPage('/e/abcdefghij', true)

    await screen.findByRole('heading', { name: 'Camp Weekend' })
    fireEvent.click(screen.getByRole('button', { name: 'Edit event' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add category' }))
    fireEvent.click(screen.getByLabelText('Edit Food'))
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0] as HTMLButtonElement)
    fireEvent.click(screen.getByLabelText('Delete Bread Rolls'))
    fireEvent.click(screen.getByLabelText('Delete Food'))
    fireEvent.click(screen.getByRole('button', { name: 'Delete event' }))

    expect(apiClient.updateEvent).not.toHaveBeenCalled()
    expect(apiClient.createCategory).not.toHaveBeenCalled()
    expect(apiClient.updateCategory).not.toHaveBeenCalled()
    expect(apiClient.deleteParticipant).not.toHaveBeenCalled()
    expect(apiClient.deleteItem).not.toHaveBeenCalled()
    expect(apiClient.deleteCategory).not.toHaveBeenCalled()
    expect(apiClient.deleteEvent).not.toHaveBeenCalled()
  })

  it('closes the identify dialog without replaying the pending action when cancelled', async () => {
    useApiClientMock.mockReturnValue(buildApiClient())

    renderEventPage()

    await screen.findByRole('heading', { name: 'Camp Weekend' })
    fireEvent.click(screen.getAllByRole('button', { name: 'I will bring this' })[0] as HTMLButtonElement)
    await screen.findByRole('heading', { name: 'Who are you?' })

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Who are you?' })).not.toBeInTheDocument()
    })
    expect(screen.queryByRole('heading', { name: 'Claim item' })).not.toBeInTheDocument()
  })

  it('warns before deleting the event and aborts when the warning is declined', async () => {
    const apiClient = buildApiClient()
    useStoredAdminTokenMock.mockReturnValue('a'.repeat(64))
    useApiClientMock.mockReturnValue(apiClient)

    const confirmMock = vi.spyOn(window, 'confirm').mockReturnValue(false)

    renderEventPage('/e/abcdefghij', true)

    await screen.findByRole('heading', { name: 'Camp Weekend' })
    fireEvent.click(screen.getByRole('button', { name: 'Delete event' }))

    expect(confirmMock).toHaveBeenCalledWith('Delete this event for everyone?')
    expect(apiClient.deleteEvent).not.toHaveBeenCalled()
  })

  it('surfaces share and copy errors when those browser APIs fail', async () => {
    const shareMock = vi.fn().mockRejectedValue(new Error('share failed'))
    clipboardWriteTextMock.mockRejectedValue(new Error('copy failed'))
    Object.defineProperty(navigator, 'share', { configurable: true, value: shareMock })
    useApiClientMock.mockReturnValue(buildApiClient())

    renderEventPage()

    await screen.findByRole('heading', { name: 'Camp Weekend' })
    fireEvent.click(screen.getByRole('button', { name: 'Share event' }))

    await waitFor(() => {
      expect(screen.getByText('We could not share that link.')).toBeInTheDocument()
    })

    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined })
    fireEvent.click(screen.getByRole('button', { name: 'Copy share link' }))

    await waitFor(() => {
      expect(screen.getByText('We could not copy that link.')).toBeInTheDocument()
    })
  })
})
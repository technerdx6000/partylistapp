import type { CreateEventRequest } from '@listcollab/shared'
import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { EventForm } from './EventForm'
import { renderWithProviders } from '../../../test/renderWithProviders'

describe('EventForm', () => {
  it('submits the selected starter categories and custom category using the shared schema', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    renderWithProviders(<EventForm isSubmitting={false} onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText(/Event name/i), { target: { value: 'Board Games Night' } })
    fireEvent.change(screen.getByLabelText(/Date/i), { target: { value: '2026-08-20' } })
    fireEvent.change(screen.getByLabelText(/Location/i), { target: { value: 'Community Hall' } })
    fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: 'Bring your best games' } })
    fireEvent.change(screen.getByLabelText(/Add a custom category/i), { target: { value: 'Snacks' } })
    await user.click(screen.getByRole('button', { name: 'Create event' }))
    const submittedEvent = onSubmit.mock.calls[0]?.[0] as CreateEventRequest | undefined

    expect(submittedEvent).toBeDefined()
    expect(submittedEvent?.name).toBe('Board Games Night')
    expect(submittedEvent?.eventDate).toBe('2026-08-20')
    expect(submittedEvent?.location).toBe('Community Hall')
    expect(submittedEvent?.description).toBe('Bring your best games')
    expect(submittedEvent?.categories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Food', icon: '🍽️' }),
        expect.objectContaining({ name: 'Drinks', icon: '🥤' }),
        expect.objectContaining({ name: 'Snacks', icon: null }),
      ])
    )
  })

  it('shows validation feedback when the required name is missing', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    renderWithProviders(<EventForm isSubmitting={false} onSubmit={onSubmit} />)
    await user.click(screen.getByRole('button', { name: 'Create event' }))

    expect(await screen.findByText('String must contain at least 1 character(s)')).toBeInTheDocument()
  })
})
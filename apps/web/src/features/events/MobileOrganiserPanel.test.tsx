import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { MobileOrganiserPanel } from './MobileOrganiserPanel'
import { renderWithProviders } from '../../../test/renderWithProviders'

describe('MobileOrganiserPanel', () => {
  it('renders the singular participant summary and dispatches every action', () => {
    const onAddCategory = vi.fn()
    const onAddRequirement = vi.fn()
    const onDeleteEvent = vi.fn()
    const onEditEvent = vi.fn()
    const onOpenParticipants = vi.fn()

    renderWithProviders(
      <MobileOrganiserPanel
        onAddCategory={onAddCategory}
        onAddRequirement={onAddRequirement}
        onDeleteEvent={onDeleteEvent}
        onEditEvent={onEditEvent}
        onOpenParticipants={onOpenParticipants}
        participantsCount={1}
      />
    )

    expect(screen.getByText('1 participant so far. Manage details, requirements, categories, and people from here.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Edit event' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add requirement' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add category' }))
    fireEvent.click(screen.getByRole('button', { name: 'Participants' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete event' }))

    expect(onEditEvent).toHaveBeenCalledTimes(1)
    expect(onAddRequirement).toHaveBeenCalledTimes(1)
    expect(onAddCategory).toHaveBeenCalledTimes(1)
    expect(onOpenParticipants).toHaveBeenCalledTimes(1)
    expect(onDeleteEvent).toHaveBeenCalledTimes(1)
  })

  it('renders the empty participant summary when nobody has joined yet', () => {
    renderWithProviders(
      <MobileOrganiserPanel
        onAddCategory={() => undefined}
        onAddRequirement={() => undefined}
        onDeleteEvent={() => undefined}
        onEditEvent={() => undefined}
        onOpenParticipants={() => undefined}
        participantsCount={0}
      />
    )

    expect(screen.getByText('No participants yet. Manage details, requirements, categories, and people from here.')).toBeInTheDocument()
  })
})
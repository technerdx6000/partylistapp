import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { IdentifyDialog } from './IdentifyDialog'
import { renderWithProviders } from '../../../test/renderWithProviders'

describe('IdentifyDialog', () => {
  it('lets the user select an existing participant', () => {
    const onSelectParticipant = vi.fn()

    renderWithProviders(
      <IdentifyDialog
        existingParticipants={[
          { id: 1, eventId: 1, name: 'Taylor', createdAt: '2026-08-15T00:00:00.000Z' },
          { id: 2, eventId: 1, name: 'Jordan', createdAt: '2026-08-15T00:00:00.000Z' },
        ]}
        isOpen
        onClose={() => undefined}
        onCreateParticipant={vi.fn()}
        onSelectParticipant={onSelectParticipant}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Jordan' }))

    expect(onSelectParticipant).toHaveBeenCalledWith(
      expect.objectContaining({ id: 2, name: 'Jordan' })
    )
  })

  it('trims a new participant name before saving and shows an error on failure', async () => {
    const onCreateParticipant = vi
      .fn()
      .mockRejectedValueOnce(new Error('failed'))
      .mockResolvedValueOnce({ displayName: 'Avery', participantId: 5 })

    renderWithProviders(
      <IdentifyDialog
        existingParticipants={[]}
        isOpen
        onClose={() => undefined}
        onCreateParticipant={onCreateParticipant}
        onSelectParticipant={vi.fn()}
      />
    )

    const nameInput = screen.getByLabelText('Add your name')
    fireEvent.change(nameInput, { target: { value: '  Avery  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    await waitFor(() => {
      expect(screen.getByText('We could not save that name. Try again.')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    await waitFor(() => {
      expect(onCreateParticipant).toHaveBeenLastCalledWith('Avery')
    })
  })
})
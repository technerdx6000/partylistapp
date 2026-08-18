import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ClaimItemDialog } from './ClaimItemDialog'
import { renderWithProviders } from '../../../test/renderWithProviders'

describe('ClaimItemDialog', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('defaults the quantity to the remaining amount for a new claim', () => {
    renderWithProviders(
      <ClaimItemDialog
        identity={{ displayName: 'Jordan', participantId: 2 }}
        isManageMode={false}
        isOpen
        item={{
          id: 4,
          eventId: 1,
          categoryId: 1,
          name: 'Bread Rolls',
          description: null,
          quantityRequired: 4,
          status: 'open',
          createdBy: 1,
          createdAt: '2026-08-15T00:00:00.000Z',
          updatedAt: '2026-08-15T00:00:00.000Z',
          assignments: [{ id: 11, itemId: 4, participantId: 1, quantity: 2, note: null, createdAt: '2026-08-15T00:00:00.000Z' }],
          coverage: { claimed: 2, required: 4, remaining: 2, status: 'open' },
        }}
        onClose={() => undefined}
        onDeleteAssignment={vi.fn()}
        onSave={vi.fn()}
        participants={[
          { id: 1, eventId: 1, name: 'Taylor', createdAt: '2026-08-15T00:00:00.000Z' },
          { id: 2, eventId: 1, name: 'Jordan', createdAt: '2026-08-15T00:00:00.000Z' },
        ]}
      />
    )

    expect(screen.getByLabelText('Quantity')).toHaveValue(2)
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-disabled', 'true')
  })

  it('submits a trimmed note for a new claim', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()

    renderWithProviders(
      <ClaimItemDialog
        identity={null}
        isManageMode
        isOpen
        item={{
          id: 4,
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
        }}
        onClose={() => undefined}
        onDeleteAssignment={vi.fn()}
        onSave={onSave}
        participants={[{ id: 2, eventId: 1, name: 'Jordan', createdAt: '2026-08-15T00:00:00.000Z' }]}
      />
    )

    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: 'Jordan' }))
    fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: '3' } })
    fireEvent.change(screen.getByLabelText('Optional note'), { target: { value: '  Saturday morning  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Claim item' }))

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({ note: 'Saturday morning', participantId: 2, quantity: 3 })
    })
  })

  it('regression: allows blank quantity edits while blocking submit until a valid value is re-entered', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()

    renderWithProviders(
      <ClaimItemDialog
        identity={{ displayName: 'Jordan', participantId: 2 }}
        isManageMode={false}
        isOpen
        item={{
          id: 4,
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
        }}
        onClose={() => undefined}
        onDeleteAssignment={vi.fn()}
        onSave={onSave}
        participants={[{ id: 2, eventId: 1, name: 'Jordan', createdAt: '2026-08-15T00:00:00.000Z' }]}
      />
    )

    const quantityInput = screen.getByLabelText('Quantity')
    const saveButton = screen.getByRole('button', { name: 'Claim item' })

    await user.clear(quantityInput)

    expect(quantityInput).toHaveDisplayValue('')
    expect(quantityInput).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Quantity is required')).toBeInTheDocument()

    await user.click(saveButton)

    expect(onSave).not.toHaveBeenCalled()

    await user.type(quantityInput, '4')
    await user.click(saveButton)

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({ note: null, participantId: 2, quantity: 4 })
    })
  })

  it('opens a confirmation dialog before removing an existing claim', async () => {
    const onDeleteAssignment = vi.fn().mockResolvedValue(undefined)

    renderWithProviders(
      <ClaimItemDialog
        assignment={{ id: 11, itemId: 4, participantId: 2, quantity: 2, note: 'Ready', createdAt: '2026-08-15T00:00:00.000Z' }}
        identity={{ displayName: 'Jordan', participantId: 2 }}
        isManageMode={false}
        isOpen
        item={{
          id: 4,
          eventId: 1,
          categoryId: 1,
          name: 'Bread Rolls',
          description: null,
          quantityRequired: 4,
          status: 'open',
          createdBy: 1,
          createdAt: '2026-08-15T00:00:00.000Z',
          updatedAt: '2026-08-15T00:00:00.000Z',
          assignments: [{ id: 11, itemId: 4, participantId: 2, quantity: 2, note: 'Ready', createdAt: '2026-08-15T00:00:00.000Z' }],
          coverage: { claimed: 2, required: 4, remaining: 2, status: 'open' },
        }}
        onClose={() => undefined}
        onDeleteAssignment={onDeleteAssignment}
        onSave={vi.fn()}
        participants={[{ id: 2, eventId: 1, name: 'Jordan', createdAt: '2026-08-15T00:00:00.000Z' }]}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Remove claim' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Remove claim' }))

    await waitFor(() => {
      expect(onDeleteAssignment).toHaveBeenCalledWith(11, 2)
    })
  })
})
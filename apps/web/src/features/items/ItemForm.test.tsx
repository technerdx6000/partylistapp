import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ItemForm } from './ItemForm'
import { renderWithProviders } from '../../../test/renderWithProviders'

const categories = [
  { id: 1, eventId: 1, name: 'Food', icon: '🍽️', sortOrder: 0, createdAt: '2026-08-15T00:00:00.000Z' },
  { id: 2, eventId: 1, name: 'Drinks', icon: '🥤', sortOrder: 1, createdAt: '2026-08-15T00:00:00.000Z' },
]

describe('ItemForm', () => {
  it('creates a guest contribution with an auto-claim owner and no required quantity', async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined)

    renderWithProviders(
      <ItemForm
        categories={categories}
        guestParticipantId={2}
        identity={{ displayName: 'Jordan', participantId: 2 }}
        initialCategoryId={1}
        isOpen
        item={null}
        mode="guest-create"
        onClose={() => undefined}
        onCreate={onCreate}
        onUpdate={vi.fn()}
      />
    )

    fireEvent.change(screen.getByLabelText('Item name'), { target: { value: 'Ice bag' } })
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: '  Two big bags  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith({
        categoryId: 1,
        createdBy: 2,
        description: 'Two big bags',
        name: 'Ice bag',
        quantityRequired: null,
      })
    })
  })

  it('creates an organiser requirement with a quantity', async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined)

    renderWithProviders(
      <ItemForm
        categories={categories}
        guestParticipantId={null}
        identity={null}
        initialCategoryId={null}
        isOpen
        item={null}
        mode="manage-create"
        onClose={() => undefined}
        onCreate={onCreate}
        onUpdate={vi.fn()}
      />
    )

    fireEvent.change(screen.getByLabelText('Item name'), { target: { value: 'Napkins' } })
    fireEvent.change(screen.getByLabelText('Quantity needed'), { target: { value: '6' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith({
        categoryId: null,
        createdBy: null,
        description: null,
        name: 'Napkins',
        quantityRequired: 6,
      })
    })
  })

  it('updates organiser-managed fields when editing a requirement', async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined)

    renderWithProviders(
      <ItemForm
        categories={categories}
        guestParticipantId={null}
        identity={null}
        initialCategoryId={1}
        isOpen
        item={{
          id: 8,
          eventId: 1,
          categoryId: 1,
          name: 'Bread Rolls',
          description: 'Fresh',
          quantityRequired: 4,
          status: 'open',
          createdBy: null,
          createdAt: '2026-08-15T00:00:00.000Z',
          updatedAt: '2026-08-15T00:00:00.000Z',
          assignments: [],
          coverage: { claimed: 0, required: 4, remaining: 4, status: 'open' },
        }}
        mode="manage-edit"
        onClose={() => undefined}
        onCreate={vi.fn()}
        onUpdate={onUpdate}
      />
    )

    fireEvent.change(screen.getByLabelText('Item name'), { target: { value: 'Bread rolls' } })
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: '  Wholemeal  ' } })
    fireEvent.change(screen.getByLabelText('Quantity needed'), { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith(8, {
        categoryId: 1,
        description: 'Wholemeal',
        name: 'Bread rolls',
        quantityRequired: 5,
      })
    })
  })

  it('uses the same edit form fields for non-manage item edits', async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined)

    renderWithProviders(
      <ItemForm
        categories={categories}
        guestParticipantId={null}
        identity={{ displayName: 'Jordan', participantId: 2 }}
        initialCategoryId={2}
        isOpen
        item={{
          id: 9,
          eventId: 1,
          categoryId: 2,
          name: 'Speaker',
          description: null,
          quantityRequired: null,
          status: 'completed',
          createdBy: 2,
          createdAt: '2026-08-15T00:00:00.000Z',
          updatedAt: '2026-08-15T00:00:00.000Z',
          assignments: [{ id: 44, itemId: 9, participantId: 2, quantity: 1, note: null, createdAt: '2026-08-15T00:00:00.000Z' }],
          coverage: { claimed: 1, required: null, remaining: null, status: 'completed' },
        }}
        mode="guest-edit"
        onClose={() => undefined}
        onCreate={vi.fn()}
        onUpdate={onUpdate}
      />
    )

    fireEvent.change(screen.getByLabelText('Description'), { target: { value: '  Bluetooth  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith(9, {
        categoryId: 2,
        description: 'Bluetooth',
        name: 'Speaker',
      })
    })
  })

  it('shows validation feedback instead of throwing when an item name exceeds the schema limit', async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined)

    renderWithProviders(
      <ItemForm
        categories={categories}
        guestParticipantId={null}
        identity={null}
        initialCategoryId={null}
        isOpen
        item={null}
        mode="manage-create"
        onClose={() => undefined}
        onCreate={onCreate}
        onUpdate={vi.fn()}
      />
    )

    fireEvent.change(screen.getByLabelText('Item name'), { target: { value: 'x'.repeat(121) } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(screen.getByText('String must contain at most 120 character(s)')).toBeInTheDocument()
    })
    expect(onCreate).not.toHaveBeenCalled()
  })

  it('blocks guest contribution creation when no participant id is available', async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined)

    renderWithProviders(
      <ItemForm
        categories={categories}
        guestParticipantId={null}
        identity={null}
        initialCategoryId={1}
        isOpen
        item={null}
        mode="guest-create"
        onClose={() => undefined}
        onCreate={onCreate}
        onUpdate={vi.fn()}
      />
    )

    fireEvent.change(screen.getByLabelText('Item name'), { target: { value: 'Ice bag' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(screen.getByText('Choose who you are before adding a contribution.')).toBeInTheDocument()
    })
    expect(onCreate).not.toHaveBeenCalled()
  })
})
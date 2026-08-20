import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { MobileCategoryNav } from './MobileCategoryNav'
import { renderWithProviders } from '../../../test/renderWithProviders'

describe('MobileCategoryNav', () => {
  it('renders visible item counts and switches categories', () => {
    const onChange = vi.fn()

    renderWithProviders(
      <MobileCategoryNav
        activeGroupKey="1"
        groups={[
          {
            category: {
              id: 1,
              eventId: 1,
              name: 'Food',
              icon: 'food',
              sortOrder: 0,
              createdAt: '2026-08-15T00:00:00.000Z',
            },
            items: [
              {
                id: 1,
                eventId: 1,
                categoryId: 1,
                name: 'Bread Rolls',
                description: null,
                quantityRequired: 4,
                status: 'open',
                createdBy: null,
                createdAt: '2026-08-15T00:00:00.000Z',
                updatedAt: '2026-08-15T00:00:00.000Z',
                assignments: [],
                coverage: { claimed: 2, required: 4, remaining: 2, status: 'open' },
              },
            ],
            key: '1',
          },
          {
            category: {
              id: 2,
              eventId: 1,
              name: 'Drinks',
              icon: 'drinks',
              sortOrder: 1,
              createdAt: '2026-08-15T00:00:00.000Z',
            },
            items: [
              {
                id: 2,
                eventId: 1,
                categoryId: 2,
                name: 'Water bottles',
                description: null,
                quantityRequired: 6,
                status: 'open',
                createdBy: null,
                createdAt: '2026-08-15T00:00:00.000Z',
                updatedAt: '2026-08-15T00:00:00.000Z',
                assignments: [],
                coverage: { claimed: 0, required: 6, remaining: 6, status: 'open' },
              },
            ],
            key: '2',
          },
        ]}
        onChange={onChange}
      />
    )

    expect(screen.getAllByText('1')).toHaveLength(2)
    expect(screen.getByRole('tab', { name: 'Food, 1 item' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Drinks, 1 item' }))

    expect(onChange).toHaveBeenCalledWith('2')
  })

  it('renders visible item counts for uncategorised groups', () => {
    renderWithProviders(
      <MobileCategoryNav
        activeGroupKey="uncategorised"
        groups={[
          {
            category: null,
            items: [
              {
                id: 2,
                eventId: 1,
                categoryId: null,
                name: 'Portable speaker',
                description: null,
                quantityRequired: null,
                status: 'open',
                createdBy: null,
                createdAt: '2026-08-15T00:00:00.000Z',
                updatedAt: '2026-08-15T00:00:00.000Z',
                assignments: [{ id: 1, itemId: 2, participantId: 4, quantity: 1, note: null, createdAt: '2026-08-15T00:00:00.000Z' }],
                coverage: { claimed: 1, required: null, remaining: null, status: 'completed' },
              },
            ],
            key: 'uncategorised',
          },
        ]}
        onChange={() => undefined}
      />
    )

    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Uncategorised, 1 item' })).toBeInTheDocument()
  })

  it('renders plural item counts for multiple items', () => {
    renderWithProviders(
      <MobileCategoryNav
        activeGroupKey="uncategorised"
        groups={[
          {
            category: null,
            items: [
              {
                id: 2,
                eventId: 1,
                categoryId: null,
                name: 'Portable speaker',
                description: null,
                quantityRequired: null,
                status: 'open',
                createdBy: null,
                createdAt: '2026-08-15T00:00:00.000Z',
                updatedAt: '2026-08-15T00:00:00.000Z',
                assignments: [
                  { id: 1, itemId: 2, participantId: 4, quantity: 1, note: null, createdAt: '2026-08-15T00:00:00.000Z' },
                  { id: 2, itemId: 2, participantId: 5, quantity: 1, note: null, createdAt: '2026-08-15T00:00:00.000Z' },
                ],
                coverage: { claimed: 2, required: null, remaining: null, status: 'completed' },
              },
              {
                id: 3,
                eventId: 1,
                categoryId: null,
                name: 'Ice bags',
                description: null,
                quantityRequired: null,
                status: 'open',
                createdBy: null,
                createdAt: '2026-08-15T00:00:00.000Z',
                updatedAt: '2026-08-15T00:00:00.000Z',
                assignments: [{ id: 3, itemId: 3, participantId: 6, quantity: 1, note: null, createdAt: '2026-08-15T00:00:00.000Z' }],
                coverage: { claimed: 1, required: null, remaining: null, status: 'completed' },
              },
            ],
            key: 'uncategorised',
          },
        ]}
        onChange={() => undefined}
      />
    )

    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Uncategorised, 2 items' })).toBeInTheDocument()
  })

  it('renders zero for an empty category', () => {
    renderWithProviders(
      <MobileCategoryNav
        activeGroupKey="1"
        groups={[
          {
            category: {
              id: 1,
              eventId: 1,
              name: 'Food',
              icon: 'food',
              sortOrder: 0,
              createdAt: '2026-08-15T00:00:00.000Z',
            },
            items: [],
            key: '1',
          },
        ]}
        onChange={() => undefined}
      />
    )

    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Food, 0 items' })).toBeInTheDocument()
  })
})
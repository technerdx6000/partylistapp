import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ItemList } from './ItemList'
import { renderWithProviders } from '../../../test/renderWithProviders'

describe('ItemList', () => {
  it('groups items by category order and renders an uncategorised section', () => {
    renderWithProviders(
      <ItemList
        categories={[
          {
            id: 2,
            eventId: 1,
            name: 'Equipment',
            icon: '🧰',
            sortOrder: 2,
            createdAt: '2026-08-15T00:00:00.000Z',
          },
          {
            id: 1,
            eventId: 1,
            name: 'Food',
            icon: '🍽️',
            sortOrder: 1,
            createdAt: '2026-08-15T00:00:00.000Z',
          },
        ]}
        items={[
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
            coverage: { claimed: 0, required: 4, remaining: 4, status: 'open' },
          },
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
            assignments: [],
            coverage: { claimed: 0, required: null, remaining: null, status: 'open' },
          },
        ]}
        participants={[]}
      />
    )

    expect(screen.getByText('Food')).toBeInTheDocument()
    expect(screen.getByText('Uncategorised')).toBeInTheDocument()
    expect(screen.getByText('Bread Rolls')).toBeInTheDocument()
    expect(screen.getByText('Portable speaker')).toBeInTheDocument()
  })
})
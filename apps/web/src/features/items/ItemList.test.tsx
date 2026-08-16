import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { getCategoryGroupKey } from './groupItemsByCategory'
import { ItemList } from './ItemList'
import { renderWithProviders } from '../../../test/renderWithProviders'

describe('ItemList', () => {
  it('uses a stable key for the uncategorised group', () => {
    expect(getCategoryGroupKey(null)).toBe('uncategorised')
  })

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
        currentIdentity={null}
        isManageMode={false}
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
        onAddItem={() => undefined}
        onClaim={() => undefined}
        participants={[]}
      />
    )

    expect(screen.getByText('Food')).toBeInTheDocument()
    expect(screen.getByText('Equipment')).toBeInTheDocument()
    expect(screen.getByText('Uncategorised')).toBeInTheDocument()
    expect(screen.getByText('Bread Rolls')).toBeInTheDocument()
    expect(screen.getByText('Portable speaker')).toBeInTheDocument()
    expect(screen.getByText('No items in this category yet. Add the first one here.')).toBeInTheDocument()
    expect(screen.getAllByRole('list')).toHaveLength(3)
  })

  it('renders only the requested category group when a visible group key is provided', () => {
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
        currentIdentity={null}
        isManageMode={false}
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
            categoryId: 2,
            name: 'Camp chairs',
            description: null,
            quantityRequired: 4,
            status: 'open',
            createdBy: null,
            createdAt: '2026-08-15T00:00:00.000Z',
            updatedAt: '2026-08-15T00:00:00.000Z',
            assignments: [],
            coverage: { claimed: 0, required: 4, remaining: 4, status: 'open' },
          },
        ]}
        onAddItem={() => undefined}
        onClaim={() => undefined}
        participants={[]}
        visibleGroupKey={getCategoryGroupKey(2)}
      />
    )

    expect(screen.getByText('Equipment')).toBeInTheDocument()
    expect(screen.getByText('Camp chairs')).toBeInTheDocument()
    expect(screen.queryByText('Food')).not.toBeInTheDocument()
    expect(screen.queryByText('Bread Rolls')).not.toBeInTheDocument()
    expect(screen.getAllByRole('list')).toHaveLength(1)
  })
})
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CategorySection } from './CategorySection'
import { renderWithProviders } from '../../../test/renderWithProviders'

describe('CategorySection', () => {
  it('renders the category heading and its item rows', () => {
    renderWithProviders(
      <CategorySection
        category={{
          id: 3,
          eventId: 1,
          name: 'Drinks',
          icon: '🥤',
          sortOrder: 1,
          createdAt: '2026-08-15T00:00:00.000Z',
        }}
        items={[
          {
            id: 7,
            eventId: 1,
            categoryId: 3,
            name: 'Soda cans',
            description: null,
            quantityRequired: 4,
            status: 'open',
            createdBy: 2,
            createdAt: '2026-08-15T00:00:00.000Z',
            updatedAt: '2026-08-15T00:00:00.000Z',
            assignments: [],
            coverage: { claimed: 0, required: 4, remaining: 4, status: 'open' },
          },
        ]}
        currentIdentity={null}
        isManageMode={false}
        onAddItem={() => undefined}
        onClaim={() => undefined}
        participants={[]}
      />
    )

    expect(screen.getByText('Drinks')).toBeInTheDocument()
    expect(screen.getByText('0 / 1 covered')).toBeInTheDocument()
    expect(screen.getByText('Soda cans')).toBeInTheDocument()
  })

  it('renders an empty-category prompt when no items belong to the section', () => {
    renderWithProviders(
      <CategorySection
        category={{
          id: 4,
          eventId: 1,
          name: 'Dessert',
          icon: 'D',
          sortOrder: 2,
          createdAt: '2026-08-15T00:00:00.000Z',
        }}
        items={[]}
        currentIdentity={null}
        isManageMode={true}
        onAddItem={() => undefined}
        onClaim={() => undefined}
        participants={[]}
      />
    )

    expect(screen.getByText('No items in this category yet. Add the first one here.')).toBeInTheDocument()
  })
})
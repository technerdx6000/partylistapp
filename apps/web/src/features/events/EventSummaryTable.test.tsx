import type { EventItemWithAssignments } from '@listcollab/shared'
import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { EventSummaryTable } from './EventSummaryTable'
import { renderWithProviders } from '../../../test/renderWithProviders'

const participantsById = new Map([
  [1, 'Taylor'],
  [2, 'Jordan'],
])

function renderSummaryTable(items: readonly EventItemWithAssignments[], emptyMessage = 'Nothing to summarise.') {
  return renderWithProviders(
    <EventSummaryTable emptyMessage={emptyMessage} items={items} participantsById={participantsById} />
  )
}

function getSummaryItemNamesInOrder(): string[] {
  return screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[0]?.textContent?.trim() ?? '')
}

describe('EventSummaryTable', () => {
  it('renders one row per assignment without adding an unassigned row when the item is already partially assigned', () => {
    renderSummaryTable([
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
        assignments: [
          { id: 11, itemId: 1, participantId: 1, quantity: 2, note: null, createdAt: '2026-08-15T00:00:00.000Z' },
          { id: 12, itemId: 1, participantId: 2, quantity: 1, note: null, createdAt: '2026-08-15T00:00:00.000Z' },
        ],
        coverage: { claimed: 3, required: 4, remaining: 1, status: 'open' },
      },
    ])

    expect(screen.getByRole('table', { name: 'Event summary' })).toBeInTheDocument()
    expect(screen.getAllByText('Bread Rolls')).toHaveLength(2)
    expect(screen.getByText('Taylor')).toBeInTheDocument()
    expect(screen.getByText('Jordan')).toBeInTheDocument()
    expect(screen.queryByText('Unassigned')).not.toBeInTheDocument()
    expect(screen.getAllByText('2')).toHaveLength(1)
    expect(screen.getAllByText('1')).toHaveLength(3)
  })

  it('includes ad-hoc contribution items in the summary', () => {
    renderSummaryTable([
      {
        id: 2,
        eventId: 1,
        categoryId: null,
        name: 'Ice bag',
        description: null,
        quantityRequired: null,
        status: 'open',
        createdBy: 1,
        createdAt: '2026-08-15T00:00:00.000Z',
        updatedAt: '2026-08-15T00:00:00.000Z',
        assignments: [{ id: 21, itemId: 2, participantId: 1, quantity: 1, note: null, createdAt: '2026-08-15T00:00:00.000Z' }],
        coverage: { claimed: 1, required: null, remaining: null, status: 'completed' },
      },
    ])

    expect(screen.getByText('Ice bag')).toBeInTheDocument()
    expect(screen.getByText('Taylor')).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('renders an unassigned row when nobody has claimed a required item yet', () => {
    renderSummaryTable([
      {
        id: 3,
        eventId: 1,
        categoryId: 1,
        name: 'Napkins',
        description: null,
        quantityRequired: 2,
        status: 'open',
        createdBy: 1,
        createdAt: '2026-08-15T00:00:00.000Z',
        updatedAt: '2026-08-15T00:00:00.000Z',
        assignments: [],
        coverage: { claimed: 0, required: 2, remaining: 2, status: 'open' },
      },
    ])

    expect(screen.getByText('Napkins')).toBeInTheDocument()
    expect(screen.getByText('Unassigned')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getAllByText('2')).toHaveLength(1)
  })

  it('orders summary rows with outstanding items first and keeps each item row block contiguous', () => {
    renderSummaryTable([
      {
        id: 4,
        eventId: 1,
        categoryId: 1,
        name: 'Zebra Tent',
        description: null,
        quantityRequired: 1,
        status: 'open',
        createdBy: 1,
        createdAt: '2026-08-15T00:00:00.000Z',
        updatedAt: '2026-08-15T00:00:00.000Z',
        assignments: [{ id: 41, itemId: 4, participantId: 1, quantity: 1, note: null, createdAt: '2026-08-15T00:00:00.000Z' }],
        coverage: { claimed: 1, required: 1, remaining: 0, status: 'covered' },
      },
      {
        id: 3,
        eventId: 1,
        categoryId: null,
        name: 'banana Bread',
        description: null,
        quantityRequired: null,
        status: 'open',
        createdBy: 2,
        createdAt: '2026-08-15T00:00:00.000Z',
        updatedAt: '2026-08-15T00:00:00.000Z',
        assignments: [{ id: 31, itemId: 3, participantId: 2, quantity: 1, note: null, createdAt: '2026-08-15T00:00:00.000Z' }],
        coverage: { claimed: 1, required: null, remaining: null, status: 'completed' },
      },
      {
        id: 1,
        eventId: 1,
        categoryId: null,
        name: 'apple Juice',
        description: null,
        quantityRequired: null,
        status: 'open',
        createdBy: 1,
        createdAt: '2026-08-15T00:00:00.000Z',
        updatedAt: '2026-08-15T00:00:00.000Z',
        assignments: [],
        coverage: { claimed: 0, required: null, remaining: null, status: 'open' },
      },
      {
        id: 2,
        eventId: 1,
        categoryId: 1,
        name: 'Apricot Jam',
        description: null,
        quantityRequired: 3,
        status: 'open',
        createdBy: 2,
        createdAt: '2026-08-15T00:00:00.000Z',
        updatedAt: '2026-08-15T00:00:00.000Z',
        assignments: [
          { id: 21, itemId: 2, participantId: 1, quantity: 1, note: null, createdAt: '2026-08-15T00:00:00.000Z' },
          { id: 22, itemId: 2, participantId: 2, quantity: 1, note: null, createdAt: '2026-08-15T00:00:00.000Z' },
        ],
        coverage: { claimed: 2, required: 3, remaining: 1, status: 'open' },
      },
    ])

    expect(getSummaryItemNamesInOrder()).toEqual([
      'apple Juice',
      'Apricot Jam',
      'Apricot Jam',
      'banana Bread',
      'Zebra Tent',
    ])
  })
})
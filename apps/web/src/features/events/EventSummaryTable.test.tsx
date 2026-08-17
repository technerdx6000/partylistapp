import type { EventItemWithAssignments } from '@listcollab/shared'
import { screen } from '@testing-library/react'
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

describe('EventSummaryTable', () => {
  it('renders one row per assignment and an unassigned remainder row when work is still outstanding', () => {
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
    expect(screen.getAllByText('Bread Rolls')).toHaveLength(3)
    expect(screen.getByText('Taylor')).toBeInTheDocument()
    expect(screen.getByText('Jordan')).toBeInTheDocument()
    expect(screen.getByText('Unassigned')).toBeInTheDocument()
    expect(screen.getAllByText('2')).toHaveLength(1)
    expect(screen.getAllByText('1')).toHaveLength(4)
  })

  it('excludes ad-hoc contribution items from the summary', () => {
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

    expect(screen.getByText('Nothing to summarise.')).toBeInTheDocument()
    expect(screen.queryByText('Ice bag')).not.toBeInTheDocument()
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
})
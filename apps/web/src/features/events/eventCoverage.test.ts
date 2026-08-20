import { describe, expect, it } from 'vitest'

import { getCategoryCoverageSummary, getEventCoverageSummary } from './eventCoverage'

describe('eventCoverage', () => {
  it('excludes ad-hoc contributions from the event coverage denominator', () => {
    const summary = getEventCoverageSummary([
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
        assignments: [{ id: 1, itemId: 1, participantId: 1, quantity: 2, note: null, createdAt: '2026-08-15T00:00:00.000Z' }],
        coverage: { claimed: 2, required: 4, remaining: 2, status: 'open' },
      },
      {
        id: 2,
        eventId: 1,
        categoryId: 1,
        name: 'Portable speaker',
        description: null,
        quantityRequired: null,
        status: 'completed',
        createdBy: 2,
        createdAt: '2026-08-15T00:00:00.000Z',
        updatedAt: '2026-08-15T00:00:00.000Z',
        assignments: [{ id: 2, itemId: 2, participantId: 2, quantity: 1, note: null, createdAt: '2026-08-15T00:00:00.000Z' }],
        coverage: { claimed: 1, required: null, remaining: null, status: 'completed' },
      },
    ])

    expect(summary).toEqual({ readyItems: 1, totalItems: 2 })
  })

  it('counts ready and total items across both requirements and contributions', () => {
    const summary = getCategoryCoverageSummary([
      {
        id: 1,
        eventId: 1,
        categoryId: 1,
        name: 'Bread Rolls',
        description: null,
        quantityRequired: 4,
        status: 'covered',
        createdBy: null,
        createdAt: '2026-08-15T00:00:00.000Z',
        updatedAt: '2026-08-15T00:00:00.000Z',
        assignments: [{ id: 1, itemId: 1, participantId: 1, quantity: 4, note: null, createdAt: '2026-08-15T00:00:00.000Z' }],
        coverage: { claimed: 4, required: 4, remaining: 0, status: 'covered' },
      },
      {
        id: 2,
        eventId: 1,
        categoryId: 1,
        name: 'Napkins',
        description: null,
        quantityRequired: 2,
        status: 'open',
        createdBy: null,
        createdAt: '2026-08-15T00:00:00.000Z',
        updatedAt: '2026-08-15T00:00:00.000Z',
        assignments: [{ id: 2, itemId: 2, participantId: 1, quantity: 1, note: null, createdAt: '2026-08-15T00:00:00.000Z' }],
        coverage: { claimed: 1, required: 2, remaining: 1, status: 'open' },
      },
      {
        id: 3,
        eventId: 1,
        categoryId: 1,
        name: 'Portable speaker',
        description: null,
        quantityRequired: null,
        status: 'completed',
        createdBy: 2,
        createdAt: '2026-08-15T00:00:00.000Z',
        updatedAt: '2026-08-15T00:00:00.000Z',
        assignments: [{ id: 3, itemId: 3, participantId: 2, quantity: 1, note: null, createdAt: '2026-08-15T00:00:00.000Z' }],
        coverage: { claimed: 1, required: null, remaining: null, status: 'completed' },
      },
    ])

    expect(summary).toEqual({ readyItems: 2, totalItems: 3 })
  })
})
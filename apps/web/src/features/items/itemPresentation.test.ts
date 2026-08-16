import { describe, expect, it } from 'vitest'

import { canEditAssignment, formatAssignmentSummary, getCompactItemStatusLabel, getContributionSummary, getItemStateMeta } from './itemPresentation'

const baseAssignment = {
  createdAt: '2026-08-15T00:00:00.000Z',
  id: 1,
  itemId: 1,
  note: null,
  participantId: 1,
  quantity: 2,
}

describe('itemPresentation', () => {
  it('formats empty and populated assignment summaries', () => {
    expect(
      formatAssignmentSummary(
        {
          assignments: [],
          categoryId: 1,
          coverage: { claimed: 0, remaining: 2, required: 2, status: 'open' },
          createdAt: '2026-08-15T00:00:00.000Z',
          createdBy: null,
          description: null,
          eventId: 1,
          id: 1,
          name: 'Bread Rolls',
          quantityRequired: 2,
          status: 'open',
          updatedAt: '2026-08-15T00:00:00.000Z',
        },
        new Map()
      )
    ).toBe('No one has claimed this yet.')

    expect(
      formatAssignmentSummary(
        {
          assignments: [baseAssignment],
          categoryId: 1,
          coverage: { claimed: 2, remaining: 0, required: 2, status: 'covered' },
          createdAt: '2026-08-15T00:00:00.000Z',
          createdBy: null,
          description: null,
          eventId: 1,
          id: 1,
          name: 'Bread Rolls',
          quantityRequired: 2,
          status: 'open',
          updatedAt: '2026-08-15T00:00:00.000Z',
        },
        new Map([[1, 'Taylor']])
      )
    ).toBe('Taylor ×2')
  })

  it('builds contribution summaries for guest extras, creator-only extras, and requirements', () => {
    expect(
      getContributionSummary(
        {
          assignments: [baseAssignment],
          categoryId: null,
          coverage: { claimed: 2, remaining: null, required: null, status: 'completed' },
          createdAt: '2026-08-15T00:00:00.000Z',
          createdBy: 1,
          description: null,
          eventId: 1,
          id: 2,
          name: 'Ice bag',
          quantityRequired: null,
          status: 'open',
          updatedAt: '2026-08-15T00:00:00.000Z',
        },
        new Map([[1, 'Taylor']])
      )
    ).toBe('Taylor ×2 is bringing this contribution.')

    expect(
      getContributionSummary(
        {
          assignments: [],
          categoryId: null,
          coverage: { claimed: 0, remaining: null, required: null, status: 'open' },
          createdAt: '2026-08-15T00:00:00.000Z',
          createdBy: 1,
          description: null,
          eventId: 1,
          id: 3,
          name: 'Portable speaker',
          quantityRequired: null,
          status: 'open',
          updatedAt: '2026-08-15T00:00:00.000Z',
        },
        new Map([[1, 'Taylor']])
      )
    ).toBe('Taylor added this contribution.')

    expect(
      getContributionSummary(
        {
          assignments: [baseAssignment],
          categoryId: 1,
          coverage: { claimed: 2, remaining: 1, required: 3, status: 'open' },
          createdAt: '2026-08-15T00:00:00.000Z',
          createdBy: null,
          description: null,
          eventId: 1,
          id: 4,
          name: 'Napkins',
          quantityRequired: 3,
          status: 'open',
          updatedAt: '2026-08-15T00:00:00.000Z',
        },
        new Map([[1, 'Taylor']])
      )
    ).toBe('Taylor ×2')
  })

  it('computes editability and item-state branches', () => {
    expect(canEditAssignment(baseAssignment, null, false)).toBe(false)
    expect(canEditAssignment(baseAssignment, { displayName: 'Taylor', participantId: 1 }, false)).toBe(true)
    expect(canEditAssignment(baseAssignment, null, true)).toBe(true)

    expect(
      getItemStateMeta({
        assignments: [],
        categoryId: null,
        coverage: { claimed: 0, remaining: null, required: null, status: 'open' },
        createdAt: '2026-08-15T00:00:00.000Z',
        createdBy: null,
        description: null,
        eventId: 1,
        id: 5,
        name: 'Portable speaker',
        quantityRequired: null,
        status: 'open',
        updatedAt: '2026-08-15T00:00:00.000Z',
      })
    ).toEqual({
      progressLabel: 'Waiting for someone to bring this contribution',
      statusLabel: 'Open contribution',
    })

    expect(
      getItemStateMeta({
        assignments: [baseAssignment],
        categoryId: null,
        coverage: { claimed: 2, remaining: null, required: null, status: 'open' },
        createdAt: '2026-08-15T00:00:00.000Z',
        createdBy: null,
        description: null,
        eventId: 1,
        id: 6,
        name: 'Ice bag',
        quantityRequired: null,
        status: 'open',
        updatedAt: '2026-08-15T00:00:00.000Z',
      })
    ).toEqual({
      progressLabel: 'Someone is bringing this contribution',
      statusLabel: 'Contribution ready',
    })

    expect(
      getItemStateMeta({
        assignments: [baseAssignment],
        categoryId: null,
        coverage: { claimed: 2, remaining: null, required: null, status: 'completed' },
        createdAt: '2026-08-15T00:00:00.000Z',
        createdBy: null,
        description: null,
        eventId: 1,
        id: 7,
        name: 'Ice bag',
        quantityRequired: null,
        status: 'completed',
        updatedAt: '2026-08-15T00:00:00.000Z',
      })
    ).toEqual({
      progressLabel: 'Marked complete by the organiser',
      statusLabel: 'Completed contribution',
    })

    expect(
      getItemStateMeta({
        assignments: [baseAssignment],
        categoryId: 1,
        coverage: { claimed: 2, remaining: 1, required: 3, status: 'open' },
        createdAt: '2026-08-15T00:00:00.000Z',
        createdBy: null,
        description: null,
        eventId: 1,
        id: 8,
        name: 'Napkins',
        quantityRequired: 3,
        status: 'completed',
        updatedAt: '2026-08-15T00:00:00.000Z',
      })
    ).toEqual({
      progressLabel: 'Marked complete by the organiser',
      statusLabel: 'Completed · 2 / 3',
    })

    expect(
      getItemStateMeta({
        assignments: [baseAssignment],
        categoryId: 1,
        coverage: { claimed: 2, remaining: 0, required: 2, status: 'covered' },
        createdAt: '2026-08-15T00:00:00.000Z',
        createdBy: null,
        description: null,
        eventId: 1,
        id: 9,
        name: 'Bread Rolls',
        quantityRequired: 2,
        status: 'open',
        updatedAt: '2026-08-15T00:00:00.000Z',
      })
    ).toEqual({
      progressLabel: 'All required quantities are claimed',
      statusLabel: 'Covered · 2 / 2',
    })

    expect(
      getItemStateMeta({
        assignments: [],
        categoryId: 1,
        coverage: { claimed: 0, remaining: 3, required: 3, status: 'open' },
        createdAt: '2026-08-15T00:00:00.000Z',
        createdBy: null,
        description: null,
        eventId: 1,
        id: 10,
        name: 'Napkins',
        quantityRequired: 3,
        status: 'open',
        updatedAt: '2026-08-15T00:00:00.000Z',
      })
    ).toEqual({
      progressLabel: '3 still needed',
      statusLabel: 'Open · 0 / 3',
    })

    expect(
      getItemStateMeta({
        assignments: [baseAssignment],
        categoryId: 1,
        coverage: { claimed: 2, remaining: 1, required: 3, status: 'open' },
        createdAt: '2026-08-15T00:00:00.000Z',
        createdBy: null,
        description: null,
        eventId: 1,
        id: 11,
        name: 'Napkins',
        quantityRequired: 3,
        status: 'open',
        updatedAt: '2026-08-15T00:00:00.000Z',
      })
    ).toEqual({
      progressLabel: '1 still needed',
      statusLabel: 'Partly covered · 2 / 3',
    })
  })

  it('builds compact row status labels for contributions and required items', () => {
    expect(
      getCompactItemStatusLabel({
        assignments: [],
        categoryId: null,
        coverage: { claimed: 0, remaining: null, required: null, status: 'open' },
        createdAt: '2026-08-15T00:00:00.000Z',
        createdBy: null,
        description: null,
        eventId: 1,
        id: 9,
        name: 'Portable speaker',
        quantityRequired: null,
        status: 'open',
        updatedAt: '2026-08-15T00:00:00.000Z',
      })
    ).toBe('Open contribution')

    expect(
      getCompactItemStatusLabel({
        assignments: [baseAssignment],
        categoryId: null,
        coverage: { claimed: 1, remaining: null, required: null, status: 'completed' },
        createdAt: '2026-08-15T00:00:00.000Z',
        createdBy: null,
        description: null,
        eventId: 1,
        id: 10,
        name: 'Ice bag',
        quantityRequired: null,
        status: 'open',
        updatedAt: '2026-08-15T00:00:00.000Z',
      })
    ).toBe('Closed contribution')

    expect(
      getCompactItemStatusLabel({
        assignments: [baseAssignment],
        categoryId: 1,
        coverage: { claimed: 2, remaining: 0, required: 2, status: 'covered' },
        createdAt: '2026-08-15T00:00:00.000Z',
        createdBy: null,
        description: null,
        eventId: 1,
        id: 12,
        name: 'Bread Rolls',
        quantityRequired: 2,
        status: 'open',
        updatedAt: '2026-08-15T00:00:00.000Z',
      })
    ).toBe('Closed · 0 left')

    expect(
      getCompactItemStatusLabel({
        assignments: [baseAssignment],
        categoryId: 1,
        coverage: { claimed: 2, remaining: 1, required: 3, status: 'open' },
        createdAt: '2026-08-15T00:00:00.000Z',
        createdBy: null,
        description: null,
        eventId: 1,
        id: 13,
        name: 'Napkins',
        quantityRequired: 3,
        status: 'open',
        updatedAt: '2026-08-15T00:00:00.000Z',
      })
    ).toBe('Open · 1 left')
  })
})
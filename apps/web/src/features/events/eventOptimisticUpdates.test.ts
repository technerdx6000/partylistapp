import type { AggregateEventResponse } from '@listcollab/shared'
import { describe, expect, it } from 'vitest'

import { applyOptimisticAssignment, removeOptimisticAssignment } from './eventOptimisticUpdates'

function buildEventData(): AggregateEventResponse {
  return {
    event: {
      id: 1,
      name: 'Camp Weekend',
      description: null,
      eventDate: null,
      location: null,
      shareToken: 'abcdefghij',
      createdAt: '2026-08-15T00:00:00.000Z',
      updatedAt: '2026-08-15T00:00:00.000Z',
    },
    participants: [
      { id: 1, eventId: 1, name: 'Taylor', createdAt: '2026-08-15T00:00:00.000Z' },
      { id: 2, eventId: 1, name: 'Jordan', createdAt: '2026-08-15T00:00:00.000Z' },
    ],
    categories: [{ id: 1, eventId: 1, name: 'Food', icon: '🍽️', sortOrder: 0, createdAt: '2026-08-15T00:00:00.000Z' }],
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
        assignments: [{ id: 11, itemId: 1, participantId: 1, quantity: 2, note: null, createdAt: '2026-08-15T00:00:00.000Z' }],
        coverage: { claimed: 2, required: 4, remaining: 2, status: 'open' },
      },
    ],
  }
}

describe('eventOptimisticUpdates', () => {
  it('adds an optimistic claim and recalculates item coverage', () => {
    const updatedEvent = applyOptimisticAssignment(buildEventData(), {
      itemId: 1,
      note: 'Saturday morning',
      participantId: 2,
      quantity: 1,
    })

    expect(updatedEvent.items[0]?.assignments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ participantId: 2, quantity: 1, note: 'Saturday morning' }),
      ])
    )
    expect(updatedEvent.items[0]?.coverage).toEqual({ claimed: 3, required: 4, remaining: 1, status: 'open' })
  })

  it('updates an existing claim and preserves item identity', () => {
    const previousEvent = {
      ...buildEventData(),
      items: [
        {
          ...buildEventData().items[0]!,
          assignments: [
            { id: 11, itemId: 1, participantId: 1, quantity: 2, note: null, createdAt: '2026-08-15T00:00:00.000Z' },
            { id: 12, itemId: 1, participantId: 2, quantity: 1, note: null, createdAt: '2026-08-15T00:00:00.000Z' },
          ],
          coverage: { claimed: 3, required: 4, remaining: 1, status: 'open' as const },
        },
      ],
    }
    const existingAssignment = previousEvent.items[0]!.assignments[0]!
    const updatedEvent = applyOptimisticAssignment(previousEvent, {
      assignment: existingAssignment,
      itemId: 1,
      note: 'Bringing all four',
      participantId: 1,
      quantity: 4,
    })

    expect(updatedEvent.items[0]?.assignments[0]).toEqual(
      expect.objectContaining({ id: 11, note: 'Bringing all four', quantity: 4 })
    )
    expect(updatedEvent.items[0]?.assignments[1]).toEqual(
      expect.objectContaining({ id: 12, participantId: 2, quantity: 1 })
    )
    expect(updatedEvent.items[0]?.coverage).toEqual({ claimed: 5, required: 4, remaining: 0, status: 'covered' })
  })

  it('removes a claim and recalculates the remaining quantity', () => {
    const updatedEvent = removeOptimisticAssignment(buildEventData(), 11)

    expect(updatedEvent.items[0]?.assignments).toEqual([])
    expect(updatedEvent.items[0]?.coverage).toEqual({ claimed: 0, required: 4, remaining: 4, status: 'open' })
  })

  it('leaves items unchanged when removing an unrelated assignment id', () => {
    const previousEvent = buildEventData()
    const updatedEvent = removeOptimisticAssignment(previousEvent, 999)

    expect(updatedEvent).toEqual(previousEvent)
  })
})
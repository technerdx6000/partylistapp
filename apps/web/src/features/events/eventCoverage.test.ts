import { describe, expect, it } from 'vitest'

import { getEventCoverageSummary } from './eventCoverage'

describe('getEventCoverageSummary', () => {
  it('ignores ad-hoc contribution items when computing event totals', () => {
    expect(
      getEventCoverageSummary([
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
        {
          id: 2,
          eventId: 1,
          categoryId: null,
          name: 'Bluetooth speaker',
          description: null,
          quantityRequired: null,
          status: 'open',
          createdBy: 4,
          createdAt: '2026-08-15T00:00:00.000Z',
          updatedAt: '2026-08-15T00:00:00.000Z',
          assignments: [],
          coverage: { claimed: 1, required: null, remaining: null, status: 'completed' },
        },
      ])
    ).toEqual({ claimed: 2, required: 4, remaining: 2, status: 'open' })
  })
})
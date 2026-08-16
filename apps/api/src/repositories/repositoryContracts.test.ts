import {
  EventCategorySchema,
  EventItemAssignmentSchema,
  EventItemSchema,
  EventParticipantSchema,
  EventWithAdminTokenSchema,
} from '@listcollab/shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const repositoryMocks = vi.hoisted(() => {
  const execute = vi.fn()

  return {
    execute,
    pool: { execute },
  }
})

vi.mock('../db/pool.js', () => ({
  pool: repositoryMocks.pool,
}))

import { listAssignmentsByEventId } from './assignmentRepository.js'
import { listCategoriesByEventId } from './categoryRepository.js'
import { findEventById } from './eventRepository.js'
import { listItemsByEventId } from './itemRepository.js'
import { listParticipantsByEventId } from './participantRepository.js'

describe('repository shared schema contracts', () => {
  beforeEach(() => {
    repositoryMocks.execute.mockReset()
  })

  it('maps event rows to the shared event contract when mysql returns Date objects', async () => {
    repositoryMocks.execute.mockResolvedValueOnce([
      [
        {
          id: 7,
          name: 'Live Event',
          description: 'Created in production',
          event_date: new Date('2026-08-16T00:00:00.000Z'),
          location: 'AtlasHub',
          share_token: 'abcdefghij',
          admin_token: 'a'.repeat(64),
          created_at: new Date('2026-08-16T08:30:00.000Z'),
          updated_at: new Date('2026-08-16T09:30:00.000Z'),
        },
      ],
    ])

    const event = await findEventById(7)

    expect(EventWithAdminTokenSchema.parse(event)).toMatchObject({
      id: 7,
      eventDate: '2026-08-16',
      name: 'Live Event',
    })
  })

  it('maps participant rows to the shared participant contract when mysql returns Date objects', async () => {
    repositoryMocks.execute.mockResolvedValueOnce([
      [
        {
          id: 3,
          event_id: 7,
          name: 'Taylor',
          created_at: new Date('2026-08-16T08:30:00.000Z'),
        },
      ],
    ])

    const participants = await listParticipantsByEventId(7)

    expect(EventParticipantSchema.array().parse(participants)).toHaveLength(1)
  })

  it('maps category rows to the shared category contract when mysql returns Date objects', async () => {
    repositoryMocks.execute.mockResolvedValueOnce([
      [
        {
          id: 4,
          event_id: 7,
          name: 'Food',
          icon: 'food',
          sort_order: 0,
          created_at: new Date('2026-08-16T08:30:00.000Z'),
        },
      ],
    ])

    const categories = await listCategoriesByEventId(7)

    expect(EventCategorySchema.array().parse(categories)).toHaveLength(1)
  })

  it('maps item rows to the shared item contract when mysql returns Date objects', async () => {
    repositoryMocks.execute.mockResolvedValueOnce([
      [
        {
          id: 8,
          event_id: 7,
          category_id: 4,
          name: 'Bread Rolls',
          description: 'Fresh',
          quantity_required: 2,
          status: 'open',
          created_by: 3,
          created_at: new Date('2026-08-16T08:30:00.000Z'),
          updated_at: new Date('2026-08-16T09:30:00.000Z'),
        },
      ],
    ])

    const items = await listItemsByEventId(7)

    expect(EventItemSchema.array().parse(items)).toHaveLength(1)
  })

  it('maps assignment rows to the shared assignment contract when mysql returns Date objects', async () => {
    repositoryMocks.execute.mockResolvedValueOnce([
      [
        {
          id: 9,
          item_id: 8,
          participant_id: 3,
          quantity: 1,
          note: 'I have this covered',
          created_at: new Date('2026-08-16T08:30:00.000Z'),
        },
      ],
    ])

    const assignments = await listAssignmentsByEventId(7)

    expect(EventItemAssignmentSchema.array().parse(assignments)).toHaveLength(1)
  })
})
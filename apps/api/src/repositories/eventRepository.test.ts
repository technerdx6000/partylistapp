import { describe, expect, it, vi } from 'vitest'

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

describe('findEventById', () => {
  it('regression: normalizes DATE rows to yyyy-mm-dd strings for aggregate responses', async () => {
    const eventDate = new Date('2026-08-16T00:00:00.000Z')

    repositoryMocks.execute.mockResolvedValueOnce([
      [
        {
          id: 7,
          name: 'Live Event',
          description: 'Created in production',
          event_date: eventDate,
          location: 'AtlasHub',
          share_token: 'abcdefghij',
          admin_token: 'a'.repeat(64),
          created_at: '2026-08-16T00:00:00.000Z',
          updated_at: '2026-08-16T00:00:00.000Z',
        },
      ],
    ])

    const { findEventById } = await import('./eventRepository.js')

    await expect(findEventById(7)).resolves.toMatchObject({
      id: 7,
      eventDate: '2026-08-16',
      name: 'Live Event',
    })
  })

  it('returns null when the event does not exist', async () => {
    repositoryMocks.execute.mockResolvedValueOnce([[]])

    const { findEventById } = await import('./eventRepository.js')

    await expect(findEventById(999)).resolves.toBeNull()
  })
})
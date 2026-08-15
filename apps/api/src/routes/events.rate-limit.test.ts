import type { Event, EventWithAdminToken } from '@listcollab/shared'
import express, { type Router } from 'express'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

process.env.NODE_ENV = 'production'
process.env.PORT = '3002'
process.env.DB_HOST = '127.0.0.1'
process.env.DB_PORT = '3307'
process.env.DB_NAME = 'listcollab_test'
process.env.DB_USER = 'listcollab_test_user'
process.env.DB_PASSWORD = 'listcollab_test_password_only'
process.env.CORS_ORIGIN = 'http://127.0.0.1:4273'
process.env.LOG_LEVEL = 'info'

const routeMocks = vi.hoisted(() => ({
    currentEvent: { id: 1, isAdmin: false, shareToken: 'abcdefghij', event: {} as never },
    withTransaction: vi.fn(),
    listAssignmentsByEventId: vi.fn(),
    createCategory: vi.fn(),
    listCategoriesByEventId: vi.fn(),
    createEvent: vi.fn(),
    deleteEvent: vi.fn(),
    findEventById: vi.fn(),
    toPublicEvent: vi.fn(),
    updateEvent: vi.fn(),
    listItemsByEventId: vi.fn(),
    listParticipantsByEventId: vi.fn(),
    generateAdminToken: vi.fn(),
    generateShareToken: vi.fn(),
}))

vi.mock('../db/pool.js', () => ({
    withTransaction: routeMocks.withTransaction,
}))

vi.mock('../middleware/eventToken.js', () => ({
    requireEventToken: (req: Express.Request, _res: express.Response, next: express.NextFunction) => {
        req.event = routeMocks.currentEvent
        next()
    },
    requireAdminToken: (_req: Express.Request, _res: express.Response, next: express.NextFunction) => {
        next()
    },
}))

vi.mock('../repositories/assignmentRepository.js', () => ({
    listAssignmentsByEventId: routeMocks.listAssignmentsByEventId,
}))

vi.mock('../repositories/categoryRepository.js', () => ({
    createCategory: routeMocks.createCategory,
    listCategoriesByEventId: routeMocks.listCategoriesByEventId,
}))

vi.mock('../repositories/eventRepository.js', () => ({
    createEvent: routeMocks.createEvent,
    deleteEvent: routeMocks.deleteEvent,
    findEventById: routeMocks.findEventById,
    toPublicEvent: routeMocks.toPublicEvent,
    updateEvent: routeMocks.updateEvent,
}))

vi.mock('../repositories/itemRepository.js', () => ({
    listItemsByEventId: routeMocks.listItemsByEventId,
}))

vi.mock('../repositories/participantRepository.js', () => ({
    listParticipantsByEventId: routeMocks.listParticipantsByEventId,
}))

vi.mock('../services/tokenService.js', () => ({
    generateAdminToken: routeMocks.generateAdminToken,
    generateShareToken: routeMocks.generateShareToken,
}))

async function createTestApp() {
    vi.resetModules()

    const eventsModule = await import('./events.js')
    const eventsRouter = eventsModule.default as unknown as Router
    const { errorHandler } = await import('../middleware/errorHandler.js')

    const app = express()
    app.use(express.json())
    app.use('/api/events', eventsRouter)
    app.use(errorHandler)

    return app
}

describe('events rate limiting', () => {
    beforeEach(() => {
        const event: EventWithAdminToken = {
            id: 1,
            name: 'Rate Limit Event',
            description: null,
            eventDate: null,
            location: null,
            shareToken: 'abcdefghij',
            adminToken: 'a'.repeat(64),
            createdAt: '2026-08-15T00:00:00.000Z',
            updatedAt: '2026-08-15T00:00:00.000Z',
        }

        routeMocks.currentEvent = { id: 1, isAdmin: false, shareToken: 'abcdefghij', event: {} as never }
        routeMocks.listAssignmentsByEventId.mockResolvedValue([])
        routeMocks.listCategoriesByEventId.mockResolvedValue([])
        routeMocks.findEventById.mockResolvedValue(event)
        routeMocks.toPublicEvent.mockImplementation((event: EventWithAdminToken): Event => ({
            id: event.id,
            name: event.name,
            description: event.description,
            eventDate: event.eventDate,
            location: event.location,
            shareToken: event.shareToken,
            createdAt: event.createdAt,
            updatedAt: event.updatedAt,
        }))
        routeMocks.listItemsByEventId.mockResolvedValue([])
        routeMocks.listParticipantsByEventId.mockResolvedValue([])
    })

    afterEach(() => {
        vi.clearAllMocks()
    })

    it('returns 429 with rate limit headers on the thirty-first aggregate event request', async () => {
        const app = await createTestApp()

        for (let attempt = 0; attempt < 30; attempt += 1) {
            const response = await request(app)
                .get('/api/events/abcdefghij')
                .set('X-Forwarded-For', '203.0.113.10')
            expect(response.status).toBe(200)
        }

        const response = await request(app)
            .get('/api/events/abcdefghij')
            .set('X-Forwarded-For', '203.0.113.10')

        expect(response.status).toBe(429)
        expect(
            (response.headers as Record<string, string | string[] | undefined>)['ratelimit']
        ).toEqual(expect.any(String))
        expect(
            (response.headers as Record<string, string | string[] | undefined>)['ratelimit-policy']
        ).toEqual(expect.any(String))
        expect((response.body as { error: { code: string } }).error.code).toBe('RATE_LIMITED')
        expect(JSON.stringify(response.body as { error: { code: string } })).not.toContain('abcdefghij')
    })
})
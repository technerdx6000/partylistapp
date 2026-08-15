import type { AggregateEventResponse } from '@listcollab/shared'
import express from 'express'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import eventsRouter from './events.js'

process.env.NODE_ENV = 'test'
process.env.PORT = '3002'
process.env.DB_HOST = '127.0.0.1'
process.env.DB_PORT = '3307'
process.env.DB_NAME = 'listcollab_test'
process.env.DB_USER = 'listcollab_test_user'
process.env.DB_PASSWORD = 'listcollab_test_password_only'
process.env.CORS_ORIGIN = 'http://127.0.0.1:4273'
process.env.LOG_LEVEL = 'info'

const routeMocks = vi.hoisted(() => ({
    withTransaction: vi.fn(),
    createEvent: vi.fn(),
    updateEvent: vi.fn(),
    deleteEvent: vi.fn(),
    findEventById: vi.fn(),
    findEventByShareToken: vi.fn(),
    findEventByAdminToken: vi.fn(),
    createCategory: vi.fn(),
    listCategoriesByEventId: vi.fn(),
    listParticipantsByEventId: vi.fn(),
    listItemsByEventId: vi.fn(),
    listAssignmentsByEventId: vi.fn(),
    generateShareToken: vi.fn(),
    generateAdminToken: vi.fn(),
}))

const {
    withTransaction,
    createEvent,
    updateEvent,
    deleteEvent,
    findEventById,
    findEventByShareToken,
    findEventByAdminToken,
    createCategory,
    listCategoriesByEventId,
    listParticipantsByEventId,
    listItemsByEventId,
    listAssignmentsByEventId,
    generateShareToken,
    generateAdminToken,
} = routeMocks

vi.mock('../db/pool.js', () => ({
    withTransaction: routeMocks.withTransaction,
}))

vi.mock('../repositories/eventRepository.js', () => ({
    createEvent: routeMocks.createEvent,
    updateEvent: routeMocks.updateEvent,
    deleteEvent: routeMocks.deleteEvent,
    findEventById: routeMocks.findEventById,
    findEventByShareToken: routeMocks.findEventByShareToken,
    findEventByAdminToken: routeMocks.findEventByAdminToken,
    toPublicEvent: (event: {
        id: number
        name: string
        description: string | null
        eventDate: string | null
        location: string | null
        shareToken: string
        createdAt: string
        updatedAt: string
    }) => ({
        id: event.id,
        name: event.name,
        description: event.description,
        eventDate: event.eventDate,
        location: event.location,
        shareToken: event.shareToken,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
    }),
}))

vi.mock('../repositories/categoryRepository.js', () => ({
    createCategory: routeMocks.createCategory,
    listCategoriesByEventId: routeMocks.listCategoriesByEventId,
}))

vi.mock('../repositories/participantRepository.js', () => ({
    listParticipantsByEventId: routeMocks.listParticipantsByEventId,
}))

vi.mock('../repositories/itemRepository.js', () => ({
    listItemsByEventId: routeMocks.listItemsByEventId,
}))

vi.mock('../repositories/assignmentRepository.js', () => ({
    listAssignmentsByEventId: routeMocks.listAssignmentsByEventId,
}))

vi.mock('../services/tokenService.js', () => ({
    generateShareToken: routeMocks.generateShareToken,
    generateAdminToken: routeMocks.generateAdminToken,
    tokensEqual: (left: string, right: string) => left === right,
}))

function buildEvent(overrides: Partial<{
    id: number
    name: string
    description: string | null
    eventDate: string | null
    location: string | null
    shareToken: string
    adminToken: string
    createdAt: string
    updatedAt: string
}> = {}) {
    return {
        id: 1,
        name: 'Test Event',
        description: 'Test description',
        eventDate: '2026-08-15',
        location: 'Park',
        shareToken: 'abcdefghij',
        adminToken: 'a'.repeat(64),
        createdAt: '2026-08-15T00:00:00.000Z',
        updatedAt: '2026-08-15T00:00:00.000Z',
        ...overrides,
    }
}

function buildCategory(overrides: Partial<{
    id: number
    eventId: number
    name: string
    icon: string | null
    sortOrder: number
    createdAt: string
}> = {}) {
    return {
        id: 1,
        eventId: 1,
        name: 'Food',
        icon: null,
        sortOrder: 0,
        createdAt: '2026-08-15T00:00:00.000Z',
        ...overrides,
    }
}

function buildParticipant(overrides: Partial<{
    id: number
    eventId: number
    name: string
    createdAt: string
}> = {}) {
    return {
        id: 1,
        eventId: 1,
        name: 'Alice',
        createdAt: '2026-08-15T00:00:00.000Z',
        ...overrides,
    }
}

function buildItem(overrides: Partial<{
    id: number
    eventId: number
    categoryId: number | null
    name: string
    description: string | null
    quantityRequired: number | null
    status: 'open' | 'covered' | 'completed'
    createdBy: number | null
    createdAt: string
    updatedAt: string
}> = {}) {
    return {
        id: 1,
        eventId: 1,
        categoryId: 1,
        name: 'Bread Rolls',
        description: null,
        quantityRequired: 2,
        status: 'open' as const,
        createdBy: 1,
        createdAt: '2026-08-15T00:00:00.000Z',
        updatedAt: '2026-08-15T00:00:00.000Z',
        ...overrides,
    }
}

function buildAssignment(overrides: Partial<{
    id: number
    itemId: number
    participantId: number
    quantity: number
    note: string | null
    createdAt: string
}> = {}) {
    return {
        id: 1,
        itemId: 1,
        participantId: 1,
        quantity: 1,
        note: null,
        createdAt: '2026-08-15T00:00:00.000Z',
        ...overrides,
    }
}

async function createTestApp() {
    const { errorHandler } = await import('../middleware/errorHandler.js')

    const app = express()
    app.use(express.json())
    app.use('/api/events', eventsRouter)
    app.use(errorHandler)

    return app
}

describe('events routes', () => {
    beforeEach(() => {
        withTransaction.mockImplementation(async (callback: (connection: object) => Promise<unknown>) => callback({}))
        createCategory.mockResolvedValue(undefined)
        listParticipantsByEventId.mockResolvedValue([])
        listCategoriesByEventId.mockResolvedValue([])
        listItemsByEventId.mockResolvedValue([])
        listAssignmentsByEventId.mockResolvedValue([])
        generateShareToken.mockReturnValue('abcdefghij')
        generateAdminToken.mockReturnValue('a'.repeat(64))
    })

    afterEach(() => {
        vi.clearAllMocks()
    })

    it('returns 400 when the create event payload is invalid', async () => {
        const app = await createTestApp()

        const response = await request(app).post('/api/events').send({ name: '' })

        expect(response.status).toBe(400)
        expect(response.body).toMatchObject({
            error: { code: 'VALIDATION_FAILED' },
        })
    })

    it('defaults omitted category icon and sort order during event creation', async () => {
        const event = buildEvent()
        createEvent.mockResolvedValue(event)
        findEventById.mockResolvedValue(event)
        listCategoriesByEventId.mockResolvedValue([buildCategory()])

        const app = await createTestApp()

        const response = await request(app).post('/api/events').send({
            name: 'Picnic',
            categories: [{ name: 'Food' }],
        })

        expect(response.status).toBe(201)
        expect(createCategory).toHaveBeenCalledTimes(1)
        expect(createCategory.mock.calls[0]?.[1]).toEqual({
            name: 'Food',
            icon: null,
            sortOrder: 0,
        })
    })

    it('returns assigned quantities in the aggregate event payload', async () => {
        const event = buildEvent()
        const participant = buildParticipant()
        const item = buildItem()
        const assignment = buildAssignment({ itemId: item.id, participantId: participant.id, quantity: 1 })

        findEventByShareToken.mockResolvedValue(event)
        findEventById.mockResolvedValue(event)
        listParticipantsByEventId.mockResolvedValue([participant])
        listCategoriesByEventId.mockResolvedValue([buildCategory()])
        listItemsByEventId.mockResolvedValue([item])
        listAssignmentsByEventId.mockResolvedValue([assignment])

        const app = await createTestApp()

        const response = await request(app)
            .get(`/api/events/${event.shareToken}`)
            .set('X-Event-Token', event.shareToken)
        const body = response.body as AggregateEventResponse

        expect(response.status).toBe(200)
        expect(body.items[0]).toMatchObject({
            assignments: [{ quantity: 1, participantId: participant.id }],
            coverage: { claimed: 1, remaining: 1, required: 2, status: 'open' },
        })
    })

    it('returns 404 when the aggregate event disappears after token resolution', async () => {
        const event = buildEvent()
        findEventByShareToken.mockResolvedValue(event)
        findEventById.mockResolvedValue(null)

        const app = await createTestApp()

        const response = await request(app)
            .get(`/api/events/${event.shareToken}`)
            .set('X-Event-Token', event.shareToken)

        expect(response.status).toBe(404)
        expect(response.body).toMatchObject({
            error: { code: 'EVENT_NOT_FOUND' },
        })
    })

    it('returns 400 when the update event payload contains unknown fields', async () => {
        const event = buildEvent()
        findEventByAdminToken.mockResolvedValue(event)

        const app = await createTestApp()

        const response = await request(app)
            .patch(`/api/events/${event.shareToken}`)
            .set('X-Event-Token', event.adminToken)
            .send({ unexpected: true })

        expect(response.status).toBe(400)
        expect(response.body).toMatchObject({
            error: { code: 'VALIDATION_FAILED' },
        })
    })

    it('returns 404 when an event update cannot be persisted', async () => {
        const event = buildEvent()
        findEventByAdminToken.mockResolvedValue(event)
        updateEvent.mockResolvedValue(null)

        const app = await createTestApp()

        const response = await request(app)
            .patch(`/api/events/${event.shareToken}`)
            .set('X-Event-Token', event.adminToken)
            .send({ name: 'Updated Event' })

        expect(response.status).toBe(404)
        expect(response.body).toMatchObject({
            error: { code: 'EVENT_NOT_FOUND' },
        })
    })

    it('returns 404 when an event delete no longer affects any row', async () => {
        const event = buildEvent()
        findEventByAdminToken.mockResolvedValue(event)
        deleteEvent.mockResolvedValue(false)

        const app = await createTestApp()

        const response = await request(app)
            .delete(`/api/events/${event.shareToken}`)
            .set('X-Event-Token', event.adminToken)

        expect(response.status).toBe(404)
        expect(response.body).toMatchObject({
            error: { code: 'EVENT_NOT_FOUND' },
        })
    })
})
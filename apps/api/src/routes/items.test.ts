import express from 'express'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import itemsRouter from './items.js'

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
    currentEvent: { id: 1, isAdmin: true, shareToken: 'abcdefghij', event: {} as never },
    listAssignmentsByEventId: vi.fn(),
    listAssignmentsByItemId: vi.fn(),
    findCategoryById: vi.fn(),
    createItem: vi.fn(),
    deleteItem: vi.fn(),
    findItemById: vi.fn(),
    listItemsByEventId: vi.fn(),
    updateItem: vi.fn(),
    findParticipantById: vi.fn(),
    assertCanCreateItem: vi.fn(),
    authorizeItemUpdate: vi.fn(),
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
    listAssignmentsByItemId: routeMocks.listAssignmentsByItemId,
}))

vi.mock('../repositories/categoryRepository.js', () => ({
    findCategoryById: routeMocks.findCategoryById,
}))

vi.mock('../repositories/itemRepository.js', () => ({
    createItem: routeMocks.createItem,
    deleteItem: routeMocks.deleteItem,
    findItemById: routeMocks.findItemById,
    listItemsByEventId: routeMocks.listItemsByEventId,
    updateItem: routeMocks.updateItem,
}))

vi.mock('../repositories/participantRepository.js', () => ({
    findParticipantById: routeMocks.findParticipantById,
}))

vi.mock('../services/itemService.js', () => ({
    assertCanCreateItem: routeMocks.assertCanCreateItem,
    authorizeItemUpdate: routeMocks.authorizeItemUpdate,
}))

function buildItem(overrides: Record<string, unknown> = {}) {
    return {
        id: 1,
        eventId: 1,
        categoryId: 2,
        name: 'Bread Rolls',
        description: 'Bring a dozen',
        quantityRequired: 2,
        status: 'open',
        createdBy: 4,
        createdAt: '2026-08-15T00:00:00.000Z',
        updatedAt: '2026-08-15T00:00:00.000Z',
        ...overrides,
    }
}

function buildAssignment(overrides: Record<string, unknown> = {}) {
    return {
        id: 1,
        itemId: 1,
        participantId: 4,
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
    app.use('/api/items', itemsRouter)
    app.use(errorHandler)

    return app
}

describe('items routes', () => {
    beforeEach(() => {
        routeMocks.currentEvent = { id: 1, isAdmin: true, shareToken: 'abcdefghij', event: {} as never }
        routeMocks.listAssignmentsByEventId.mockResolvedValue([])
        routeMocks.listAssignmentsByItemId.mockResolvedValue([])
        routeMocks.findCategoryById.mockResolvedValue({ id: 2 })
        routeMocks.createItem.mockResolvedValue(buildItem())
        routeMocks.deleteItem.mockResolvedValue(true)
        routeMocks.findItemById.mockResolvedValue(buildItem())
        routeMocks.listItemsByEventId.mockResolvedValue([buildItem()])
        routeMocks.updateItem.mockResolvedValue(buildItem({ name: 'Updated Item' }))
        routeMocks.findParticipantById.mockResolvedValue({ id: 4 })
        routeMocks.assertCanCreateItem.mockImplementation(() => undefined)
        routeMocks.authorizeItemUpdate.mockReturnValue({ name: 'Updated Item' })
    })

    afterEach(() => {
        vi.clearAllMocks()
    })

    it('returns item aggregates with coverage and empty assignments when none exist', async () => {
        routeMocks.listItemsByEventId.mockResolvedValue([buildItem(), buildItem({ id: 2, quantityRequired: null })])
        routeMocks.listAssignmentsByEventId.mockResolvedValue([buildAssignment()])

        const app = await createTestApp()
        const response = await request(app).get('/api/items')

        expect(response.status).toBe(200)
        expect(response.body).toEqual([
            expect.objectContaining({
                id: 1,
                assignments: [expect.objectContaining({ quantity: 1 })],
                coverage: { required: 2, claimed: 1, remaining: 1, status: 'open' },
            }),
            expect.objectContaining({
                id: 2,
                assignments: [],
                coverage: { required: null, claimed: 0, remaining: null, status: 'open' },
            }),
        ])
    })

    it('returns 400 when the create item payload is invalid', async () => {
        const app = await createTestApp()
        const response = await request(app).post('/api/items').send({ name: '' })

        expect(response.status).toBe(400)
        expect(response.body).toMatchObject({ error: { code: 'VALIDATION_FAILED' } })
    })

    it('returns 404 when the create item category does not belong to the event', async () => {
        routeMocks.findCategoryById.mockResolvedValue(null)

        const app = await createTestApp()
        const response = await request(app).post('/api/items').send({
            name: 'Chips',
            categoryId: 99,
            createdBy: 4,
        })

        expect(response.status).toBe(404)
        expect(response.body).toMatchObject({ error: { code: 'CATEGORY_NOT_IN_EVENT' } })
    })

    it('returns 404 when the create item participant does not belong to the event', async () => {
        routeMocks.findParticipantById.mockResolvedValue(null)

        const app = await createTestApp()
        const response = await request(app).post('/api/items').send({
            name: 'Chips',
            createdBy: 4,
        })

        expect(response.status).toBe(404)
        expect(response.body).toMatchObject({ error: { code: 'PARTICIPANT_NOT_IN_EVENT' } })
    })

    it('returns 400 when the item id path param is invalid', async () => {
        const app = await createTestApp()
        const response = await request(app).patch('/api/items/not-a-number').send({ name: 'Updated Item' })

        expect(response.status).toBe(400)
        expect(response.body).toMatchObject({ error: { code: 'VALIDATION_FAILED' } })
    })

    it('returns 400 when the update item payload is invalid', async () => {
        const app = await createTestApp()
        const response = await request(app).patch('/api/items/1').send({ unexpected: true })

        expect(response.status).toBe(400)
        expect(response.body).toMatchObject({ error: { code: 'VALIDATION_FAILED' } })
    })

    it('returns 404 when the item is missing before update', async () => {
        routeMocks.findItemById.mockResolvedValue(null)

        const app = await createTestApp()
        const response = await request(app).patch('/api/items/1').send({ name: 'Updated Item' })

        expect(response.status).toBe(404)
        expect(response.body).toMatchObject({ error: { code: 'ITEM_NOT_IN_EVENT' } })
    })

    it('returns 404 when the update participant id does not belong to the event', async () => {
        routeMocks.findParticipantById.mockResolvedValue(null)

        const app = await createTestApp()
        const response = await request(app)
            .patch('/api/items/1')
            .send({ participantId: 8, name: 'Updated Item' })

        expect(response.status).toBe(404)
        expect(response.body).toMatchObject({ error: { code: 'PARTICIPANT_NOT_IN_EVENT' } })
    })

    it('returns 404 when the update category does not belong to the event', async () => {
        routeMocks.authorizeItemUpdate.mockReturnValue({ categoryId: 99 })
        routeMocks.findCategoryById.mockResolvedValue(null)

        const app = await createTestApp()
        const response = await request(app).patch('/api/items/1').send({ name: 'Updated Item' })

        expect(response.status).toBe(404)
        expect(response.body).toMatchObject({ error: { code: 'CATEGORY_NOT_IN_EVENT' } })
    })

    it('returns 404 when the item update cannot be persisted', async () => {
        routeMocks.updateItem.mockResolvedValue(null)

        const app = await createTestApp()
        const response = await request(app).patch('/api/items/1').send({ name: 'Updated Item' })

        expect(response.status).toBe(404)
        expect(response.body).toMatchObject({ error: { code: 'ITEM_NOT_IN_EVENT' } })
    })

    it('returns 404 when the item delete does not resolve inside the event scope', async () => {
        routeMocks.deleteItem.mockResolvedValue(false)

        const app = await createTestApp()
        const response = await request(app).delete('/api/items/1')

        expect(response.status).toBe(404)
        expect(response.body).toMatchObject({ error: { code: 'ITEM_NOT_IN_EVENT' } })
    })
})
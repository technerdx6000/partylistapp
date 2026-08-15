import express from 'express'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import categoriesRouter from './categories.js'

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
    createCategory: vi.fn(),
    deleteCategory: vi.fn(),
    listCategoriesByEventId: vi.fn(),
    updateCategory: vi.fn(),
}))

vi.mock('../middleware/eventToken.js', () => ({
    requireEventToken: (req: Express.Request, _res: express.Response, next: express.NextFunction) => {
        req.event = { id: 1, isAdmin: true, shareToken: 'abcdefghij', event: {} as never }
        next()
    },
    requireAdminToken: (_req: Express.Request, _res: express.Response, next: express.NextFunction) => {
        next()
    },
}))

vi.mock('../repositories/categoryRepository.js', () => ({
    createCategory: routeMocks.createCategory,
    deleteCategory: routeMocks.deleteCategory,
    listCategoriesByEventId: routeMocks.listCategoriesByEventId,
    updateCategory: routeMocks.updateCategory,
}))

async function createTestApp() {
    const { errorHandler } = await import('../middleware/errorHandler.js')

    const app = express()
    app.use(express.json())
    app.use('/api/categories', categoriesRouter)
    app.use(errorHandler)

    return app
}

describe('categories routes', () => {
    beforeEach(() => {
        routeMocks.listCategoriesByEventId.mockResolvedValue([])
    })

    afterEach(() => {
        vi.clearAllMocks()
    })

    it('returns 400 when the category payload is invalid on create', async () => {
        const app = await createTestApp()

        const response = await request(app).post('/api/categories').send({ name: '' })

        expect(response.status).toBe(400)
        expect(response.body).toMatchObject({
            error: { code: 'VALIDATION_FAILED' },
        })
    })

    it('returns 400 when the category id path param is invalid', async () => {
        const app = await createTestApp()

        const response = await request(app).patch('/api/categories/not-a-number').send({ name: 'Drinks' })

        expect(response.status).toBe(400)
        expect(response.body).toMatchObject({
            error: { code: 'VALIDATION_FAILED' },
        })
    })

    it('returns 400 when the category update payload contains unknown fields', async () => {
        const app = await createTestApp()

        const response = await request(app).patch('/api/categories/1').send({ unexpected: true })

        expect(response.status).toBe(400)
        expect(response.body).toMatchObject({
            error: { code: 'VALIDATION_FAILED' },
        })
    })

    it('returns 404 when a category update does not resolve inside the event scope', async () => {
        routeMocks.updateCategory.mockResolvedValue(null)

        const app = await createTestApp()

        const response = await request(app).patch('/api/categories/1').send({ name: 'Drinks' })

        expect(response.status).toBe(404)
        expect(response.body).toMatchObject({
            error: { code: 'CATEGORY_NOT_IN_EVENT' },
        })
    })

    it('returns 404 when a category delete does not resolve inside the event scope', async () => {
        routeMocks.deleteCategory.mockResolvedValue(false)

        const app = await createTestApp()

        const response = await request(app).delete('/api/categories/1')

        expect(response.status).toBe(404)
        expect(response.body).toMatchObject({
            error: { code: 'CATEGORY_NOT_IN_EVENT' },
        })
    })
})
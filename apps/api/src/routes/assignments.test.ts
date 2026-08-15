import express from 'express'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import assignmentsRouter from './assignments.js'

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
    currentEvent: { id: 1, isAdmin: false, shareToken: 'abcdefghij', event: {} as never },
    deleteAssignmentClaim: vi.fn(),
    updateAssignmentClaim: vi.fn(),
}))

vi.mock('../middleware/eventToken.js', () => ({
    requireEventToken: (req: Express.Request, _res: express.Response, next: express.NextFunction) => {
        req.event = routeMocks.currentEvent
        next()
    },
}))

vi.mock('../services/assignmentService.js', () => ({
    deleteAssignmentClaim: routeMocks.deleteAssignmentClaim,
    updateAssignmentClaim: routeMocks.updateAssignmentClaim,
}))

async function createTestApp() {
    const { errorHandler } = await import('../middleware/errorHandler.js')

    const app = express()
    app.use(express.json())
    app.use('/api/assignments', assignmentsRouter)
    app.use(errorHandler)

    return app
}

describe('assignments routes', () => {
    beforeEach(() => {
        routeMocks.currentEvent = { id: 1, isAdmin: false, shareToken: 'abcdefghij', event: {} as never }
        routeMocks.deleteAssignmentClaim.mockResolvedValue(undefined)
        routeMocks.updateAssignmentClaim.mockResolvedValue({
            id: 1,
            itemId: 1,
            participantId: 4,
            quantity: 1,
            note: null,
            createdAt: '2026-08-15T00:00:00.000Z',
        })
    })

    afterEach(() => {
        vi.clearAllMocks()
    })

    it('returns 400 when the assignment id path param is invalid on patch', async () => {
        const app = await createTestApp()
        const response = await request(app).patch('/api/assignments/not-a-number').send({ participantId: 4, quantity: 1 })

        expect(response.status).toBe(400)
        expect(response.body).toMatchObject({ error: { code: 'VALIDATION_FAILED' } })
    })

    it('returns 400 when the assignment patch payload is invalid', async () => {
        const app = await createTestApp()
        const response = await request(app).patch('/api/assignments/1').send({ quantity: 1 })

        expect(response.status).toBe(400)
        expect(response.body).toMatchObject({ error: { code: 'VALIDATION_FAILED' } })
    })

    it('returns 400 when the assignment id path param is invalid on delete', async () => {
        const app = await createTestApp()
        const response = await request(app).delete('/api/assignments/not-a-number').send({ participantId: 4 })

        expect(response.status).toBe(400)
        expect(response.body).toMatchObject({ error: { code: 'VALIDATION_FAILED' } })
    })

    it('returns 400 when the assignment delete payload is invalid', async () => {
        const app = await createTestApp()
        const response = await request(app).delete('/api/assignments/1').send({ participantId: 'bad' })

        expect(response.status).toBe(400)
        expect(response.body).toMatchObject({ error: { code: 'VALIDATION_FAILED' } })
    })
})
import express from 'express'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import participantsRouter from './participants.js'

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
    createParticipant: vi.fn(),
    deleteParticipant: vi.fn(),
    findParticipantByName: vi.fn(),
    listParticipantsByEventId: vi.fn(),
    updateParticipant: vi.fn(),
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

vi.mock('../repositories/participantRepository.js', () => ({
    createParticipant: routeMocks.createParticipant,
    deleteParticipant: routeMocks.deleteParticipant,
    findParticipantByName: routeMocks.findParticipantByName,
    listParticipantsByEventId: routeMocks.listParticipantsByEventId,
    updateParticipant: routeMocks.updateParticipant,
}))

async function createTestApp() {
    const { errorHandler } = await import('../middleware/errorHandler.js')

    const app = express()
    app.use(express.json())
    app.use('/api/participants', participantsRouter)
    app.use(errorHandler)

    return app
}

describe('participants routes', () => {
    beforeEach(() => {
        routeMocks.findParticipantByName.mockResolvedValue(null)
        routeMocks.listParticipantsByEventId.mockResolvedValue([])
    })

    afterEach(() => {
        vi.clearAllMocks()
    })

    it('returns 400 when the participant payload is invalid on create', async () => {
        const app = await createTestApp()

        const response = await request(app).post('/api/participants').send({ name: '' })

        expect(response.status).toBe(400)
        expect(response.body).toMatchObject({
            error: { code: 'VALIDATION_FAILED' },
        })
    })

    it('returns 400 when the participant id path param is invalid', async () => {
        const app = await createTestApp()

        const response = await request(app).patch('/api/participants/not-a-number').send({ name: 'Alex' })

        expect(response.status).toBe(400)
        expect(response.body).toMatchObject({
            error: { code: 'VALIDATION_FAILED' },
        })
    })

    it('returns 400 when the participant update payload contains unknown fields', async () => {
        const app = await createTestApp()

        const response = await request(app).patch('/api/participants/1').send({ unexpected: true })

        expect(response.status).toBe(400)
        expect(response.body).toMatchObject({
            error: { code: 'VALIDATION_FAILED' },
        })
    })

    it('returns 404 when a participant update does not resolve inside the event scope', async () => {
        routeMocks.updateParticipant.mockResolvedValue(null)

        const app = await createTestApp()

        const response = await request(app).patch('/api/participants/1').send({ name: 'Alex' })

        expect(response.status).toBe(404)
        expect(response.body).toMatchObject({
            error: { code: 'PARTICIPANT_NOT_IN_EVENT' },
        })
    })

    it('returns 404 when a participant delete does not resolve inside the event scope', async () => {
        routeMocks.deleteParticipant.mockResolvedValue(false)

        const app = await createTestApp()

        const response = await request(app).delete('/api/participants/1')

        expect(response.status).toBe(404)
        expect(response.body).toMatchObject({
            error: { code: 'PARTICIPANT_NOT_IN_EVENT' },
        })
    })
})
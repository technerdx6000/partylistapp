import express, { type Router } from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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
    createParticipant: vi.fn(),
    findParticipantByName: vi.fn(),
    listParticipantsByEventId: vi.fn(),
}))

vi.mock('../middleware/eventToken.js', () => ({
    requireEventToken: (req: Express.Request, _res: express.Response, next: express.NextFunction) => {
        req.event = { id: 1, isAdmin: false, shareToken: 'abcdefghij', event: {} as never }
        next()
    },
    requireAdminToken: (_req: Express.Request, _res: express.Response, next: express.NextFunction) => {
        next()
    },
}))

vi.mock('../repositories/participantRepository.js', () => ({
    createParticipant: routeMocks.createParticipant,
    deleteParticipant: vi.fn(),
    findParticipantByName: routeMocks.findParticipantByName,
    listParticipantsByEventId: routeMocks.listParticipantsByEventId,
    updateParticipant: vi.fn(),
}))

async function createTestApp() {
    vi.resetModules()

    const participantsModule = await import('./participants.js')
    const participantsRouter = participantsModule.default as unknown as Router
    const { errorHandler } = await import('../middleware/errorHandler.js')

    const app = express()
    app.use(express.json())
    app.use('/api/participants', participantsRouter)
    app.use(errorHandler)

    return app
}

describe('participants rate limiting', () => {
    beforeEach(() => {
        routeMocks.findParticipantByName.mockResolvedValue(null)
        routeMocks.listParticipantsByEventId.mockResolvedValue([])
        routeMocks.createParticipant.mockResolvedValue({
            id: 1,
            eventId: 1,
            name: 'Guest',
            createdAt: '2026-08-15T00:00:00.000Z',
        })
    })

    it('returns 429 on the thirty-first participant create request from the same client', async () => {
        const app = await createTestApp()

        for (let attempt = 0; attempt < 30; attempt += 1) {
            const response = await request(app).post('/api/participants').send({ name: `Guest ${attempt}` })
            expect(response.status).toBe(201)
        }

        const response = await request(app).post('/api/participants').send({ name: 'Guest 31' })

        expect(response.status).toBe(429)
        expect(response.body).toMatchObject({
            error: { code: 'RATE_LIMITED' },
        })
    })
})
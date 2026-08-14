import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const executeMock = vi.fn()

vi.mock('./config/database.js', () => ({
    default: {
        execute: executeMock,
    },
}))

describe('GET /api/health', () => {
    beforeEach(() => {
        process.env.NODE_ENV = 'test'
    })

    afterEach(() => {
        executeMock.mockReset()
        vi.resetModules()
    })

    it('returns 503 when the database query fails', async () => {
        executeMock.mockRejectedValueOnce(new Error('db unavailable'))

        const { app } = await import('./server.js')
        const response = await request(app).get('/api/health')

        expect(response.status).toBe(503)
        expect(response.body).toEqual({ status: 'degraded', db: false })
    })
})
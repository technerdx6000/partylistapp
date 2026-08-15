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
        process.env.PORT = '3002'
        process.env.DB_HOST = '127.0.0.1'
        process.env.DB_PORT = '3306'
        process.env.DB_USER = 'listcollab_test_user'
        process.env.DB_PASSWORD = 'listcollab_test_password_only'
        process.env.DB_NAME = 'listcollab_test'
        process.env.CORS_ORIGIN = 'http://127.0.0.1:4273'
        process.env.LOG_LEVEL = 'info'
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

    it('applies the configured CORS and CSP headers on health responses', async () => {
        executeMock.mockResolvedValueOnce([])

        const { app } = await import('./server.js')
        const response = await request(app)
            .get('/api/health')
            .set('Origin', 'http://127.0.0.1:4273')

        expect(response.status).toBe(200)
        expect(response.headers['access-control-allow-origin']).toBe('http://127.0.0.1:4273')
        expect(response.headers['content-security-policy']).toContain("default-src 'none'")
    })

    it('rejects oversized JSON payloads', async () => {
        const { app } = await import('./server.js')
        const response = await request(app)
            .post('/api/events')
            .send({ name: 'Event', description: 'x'.repeat(120_000) })

        expect(response.status).toBe(413)
        expect(response.body).toMatchObject({
            error: { code: 'PAYLOAD_TOO_LARGE' },
        })
    })
})
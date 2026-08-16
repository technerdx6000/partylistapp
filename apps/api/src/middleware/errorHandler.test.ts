import express from 'express'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('errorHandler middleware', () => {
    beforeEach(() => {
        process.env.NODE_ENV = 'production'
        process.env.PORT = '3002'
        process.env.DB_HOST = '127.0.0.1'
        process.env.DB_PORT = '3307'
        process.env.DB_NAME = 'listcollab_test'
        process.env.DB_USER = 'listcollab_test_user'
        process.env.DB_PASSWORD = 'listcollab_test_password_only'
        process.env.CORS_ORIGIN = 'http://127.0.0.1:4273'
        process.env.LOG_LEVEL = 'info'
    })

    afterEach(() => {
        vi.restoreAllMocks()
        vi.resetModules()
    })

    it('returns a generic production-safe 500 without stack, SQL, or table names', async () => {
        const { errorHandler } = await import('./errorHandler.js')

        const app = express()
        app.get('/boom', (req, _res, next) => {
            req.requestId = 'req-500'
            next(new Error('SELECT * FROM secret_table WHERE password = leaked'))
        })
        app.use(errorHandler)

        const response = await request(app).get('/boom')

        expect(response.status).toBe(500)
        expect(response.body).toEqual({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Something went wrong',
                requestId: 'req-500',
            },
        })
        expect(JSON.stringify(response.body)).not.toContain('SELECT')
        expect(JSON.stringify(response.body)).not.toContain('secret_table')
        expect(JSON.stringify(response.body)).not.toContain('stack')
    })
})
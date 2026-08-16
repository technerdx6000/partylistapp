import { PassThrough } from 'node:stream'

import express from 'express'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const output = new PassThrough()
let buffer = ''

output.on('data', (chunk: Buffer) => {
    buffer += chunk.toString()
})

vi.mock('../../logger.js', async () => {
    const actual = await vi.importActual<typeof import('../../logger.js')>('../../logger.js')

    return {
        ...actual,
        default: actual.createLogger(output),
    }
})

describe('requestLogger middleware', () => {
    beforeEach(() => {
        buffer = ''
    })

    afterEach(() => {
        vi.clearAllMocks()
    })

    it('redacts event tokens and cookies during a full request cycle', async () => {
        const { requestLogger } = await import('./requestLogger.js')

        const app = express()
        app.use(requestLogger)
        app.get('/check', (_req, res) => {
            res.json({ ok: true })
        })

        const response = await request(app)
            .get('/check')
            .set('X-Event-Token', 'super-secret-token')
            .set('Cookie', 'session=secret-cookie')

        expect(response.status).toBe(200)
        expect(buffer).toContain('[REDACTED]')
        expect(buffer).not.toContain('super-secret-token')
        expect(buffer).not.toContain('secret-cookie')
        expect(buffer).toContain('HTTP request complete')
    })
})
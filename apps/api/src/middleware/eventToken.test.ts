import express from 'express'
import request from 'supertest'
import { afterEach, describe, expect, it, vi } from 'vitest'

const findEventByShareToken = vi.fn()
const findEventByAdminToken = vi.fn()

vi.mock('../repositories/eventRepository.js', () => ({
    findEventByShareToken,
    findEventByAdminToken,
}))

describe('event token middleware', () => {
    afterEach(() => {
        findEventByShareToken.mockReset()
        findEventByAdminToken.mockReset()
    })

    it('returns 401 when the token header is missing', async () => {
        const { requireEventToken } = await import('./eventToken.js')
        const app = express()
        app.get('/check', requireEventToken, (_req, res) => res.json({ ok: true }))

        const response = await request(app).get('/check')
        const body = response.body as { error: { code: string } }

        expect(response.status).toBe(401)
        expect(body.error.code).toBe('INVALID_TOKEN')
        expect(body.error.requestId).toBe('unknown')
    })

    it('returns 404 when the token is unknown', async () => {
        findEventByShareToken.mockResolvedValueOnce(null)

        const { requireEventToken } = await import('./eventToken.js')
        const app = express()
        app.get('/check', requireEventToken, (_req, res) => res.json({ ok: true }))

        const response = await request(app).get('/check').set('X-Event-Token', 'abcdefghij')
        const body = response.body as { error: { code: string } }

        expect(response.status).toBe(404)
        expect(body.error.code).toBe('EVENT_NOT_FOUND')
        expect(body.error.requestId).toBe('unknown')
    })

    it('returns 404 when the token is malformed', async () => {
        const { requireEventToken } = await import('./eventToken.js')
        const app = express()
        app.get('/check', requireEventToken, (_req, res) => res.json({ ok: true }))

        const response = await request(app).get('/check').set('X-Event-Token', 'bad')
        const body = response.body as { error: { code: string; requestId: string } }

        expect(response.status).toBe(404)
        expect(body.error.code).toBe('EVENT_NOT_FOUND')
        expect(body.error.requestId).toBe('unknown')
    })

    it('attaches non-admin event context for a share token', async () => {
        findEventByShareToken.mockResolvedValueOnce({
            id: 1,
            name: 'Party',
            description: null,
            eventDate: null,
            location: null,
            shareToken: 'abcdefghij',
            adminToken: 'a'.repeat(64),
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
        })

        const { requireEventToken } = await import('./eventToken.js')
        const app = express()
        app.get('/check', requireEventToken, (req, res) => {
            res.json({ eventId: req.event?.id, isAdmin: req.event?.isAdmin })
        })

        const response = await request(app).get('/check').set('X-Event-Token', 'abcdefghij')

        expect(response.status).toBe(200)
        expect(response.body).toEqual({ eventId: 1, isAdmin: false })
    })

    it('rejects non-admin callers in requireAdminToken', async () => {
        const { requireAdminToken } = await import('./eventToken.js')
        const app = express()
        app.get('/check', (req, _res, next) => {
            req.event = { id: 1, isAdmin: false, shareToken: 'abcdefghij', event: {} as never }
            next()
        }, requireAdminToken, (_req, res) => res.json({ ok: true }))

        const response = await request(app).get('/check')
        const body = response.body as { error: { code: string } }

        expect(response.status).toBe(403)
        expect(body.error.code).toBe('ADMIN_REQUIRED')
        expect(body.error.requestId).toBe('unknown')
    })
})
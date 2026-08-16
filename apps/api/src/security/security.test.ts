import mysql from 'mysql2/promise'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { loadDbEnv, loadEnv } from '../config/env.js'
import { createMigrator } from '../db/migrator.js'

const testDatabaseConfig = {
    host: '127.0.0.1',
    port: 3307,
    database: 'listcollab_test',
    user: 'listcollab_test_user',
    password: 'listcollab_test_password_only',
    rootPassword: 'test_root_password_only',
}

type EventResponse = {
    categories: Array<{ id: number }>
    event: { adminToken: string; id?: number; shareToken: string }
}

type ParticipantResponse = { id: number }

type ItemResponse = { id: number }

type AssignmentResponse = { id: number }

type ErrorResponse = {
    error: {
        code: string
        message: string
        requestId?: string
    }
}

function applyTestEnvironment(): void {
    process.env.NODE_ENV = 'test'
    process.env.PORT = '3002'
    process.env.DB_HOST = testDatabaseConfig.host
    process.env.DB_PORT = String(testDatabaseConfig.port)
    process.env.DB_NAME = testDatabaseConfig.database
    process.env.DB_USER = testDatabaseConfig.user
    process.env.DB_PASSWORD = testDatabaseConfig.password
    process.env.CORS_ORIGIN = 'http://127.0.0.1:4273'
    process.env.LOG_LEVEL = 'info'
}

async function wait(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms))
}

async function createConnectionWithRetry(connectionOptions: Parameters<typeof mysql.createConnection>[0]) {
    let lastError: unknown

    for (let attempt = 0; attempt < 20; attempt += 1) {
        try {
            return await mysql.createConnection(connectionOptions)
        } catch (error) {
            lastError = error
            await wait(1000)
        }
    }

    throw lastError
}

async function resetTestDatabase(): Promise<void> {
    const rootConnection = await createConnectionWithRetry({
        host: testDatabaseConfig.host,
        port: testDatabaseConfig.port,
        user: 'root',
        password: testDatabaseConfig.rootPassword,
        multipleStatements: true,
    })

    try {
        await rootConnection.query(`
      DROP DATABASE IF EXISTS ${testDatabaseConfig.database};
      CREATE DATABASE ${testDatabaseConfig.database}
        CHARACTER SET utf8mb4
        COLLATE utf8mb4_unicode_ci;
      CREATE USER IF NOT EXISTS '${testDatabaseConfig.user}'@'%' IDENTIFIED BY '${testDatabaseConfig.password}';
      GRANT ALL PRIVILEGES ON ${testDatabaseConfig.database}.* TO '${testDatabaseConfig.user}'@'%';
      FLUSH PRIVILEGES;
    `)
    } finally {
        await rootConnection.end()
    }
}

beforeEach(async () => {
    applyTestEnvironment()
    await resetTestDatabase()
})

describe('security suite', () => {
    it('returns indistinguishable 404 bodies for invalid tokens and unknown event paths', async () => {
        const { migrator, close } = await createMigrator()

        try {
            await migrator.up()
        } finally {
            await close()
        }

        const { app } = await import('../../server.js')

        const createEventResponse = await request(app).post('/api/events').send({ name: 'Enumeration Event' })
        const event = createEventResponse.body as EventResponse

        const malformedTokenStartedAt = performance.now()
        const malformedTokenResponse = await request(app)
            .get(`/api/events/${event.event.shareToken}`)
            .set('X-Event-Token', 'bad')
        const malformedTokenDurationMs = performance.now() - malformedTokenStartedAt

        const invalidTokenStartedAt = performance.now()
        const invalidTokenResponse = await request(app)
            .get(`/api/events/${event.event.shareToken}`)
            .set('X-Event-Token', 'zzzzzzzzzz')
        const invalidTokenDurationMs = performance.now() - invalidTokenStartedAt

        const unknownEventStartedAt = performance.now()
        const unknownEventResponse = await request(app)
            .get('/api/events/QWERTY1234')
            .set('X-Event-Token', event.event.shareToken)
        const unknownEventDurationMs = performance.now() - unknownEventStartedAt
        const malformedTokenBody = malformedTokenResponse.body as ErrorResponse
        const invalidTokenBody = invalidTokenResponse.body as ErrorResponse
        const unknownEventBody = unknownEventResponse.body as ErrorResponse

        expect(malformedTokenResponse.status).toBe(404)
        expect(invalidTokenResponse.status).toBe(404)
        expect(unknownEventResponse.status).toBe(404)
        expect(malformedTokenBody).toMatchObject({
            error: { code: 'EVENT_NOT_FOUND', message: 'Event not found' },
        })
        expect(invalidTokenBody).toMatchObject({
            error: { code: 'EVENT_NOT_FOUND', message: 'Event not found' },
        })
        expect(unknownEventBody).toMatchObject({
            error: { code: 'EVENT_NOT_FOUND', message: 'Event not found' },
        })
        expect(malformedTokenBody.error.requestId).toEqual(expect.any(String))
        expect(invalidTokenBody.error.requestId).toEqual(expect.any(String))
        expect(unknownEventBody.error.requestId).toEqual(expect.any(String))
        expect(Math.abs(malformedTokenDurationMs - unknownEventDurationMs)).toBeLessThan(150)
        expect(Math.abs(invalidTokenDurationMs - unknownEventDurationMs)).toBeLessThan(150)
    })

    it('rejects admin-only participant deletion when only a share token is supplied', async () => {
        const { migrator, close } = await createMigrator()

        try {
            await migrator.up()
        } finally {
            await close()
        }

        const { app } = await import('../../server.js')

        const createEventResponse = await request(app).post('/api/events').send({ name: 'Share Token Event' })
        const event = createEventResponse.body as EventResponse

        const createParticipantResponse = await request(app)
            .post('/api/participants')
            .set('X-Event-Token', event.event.shareToken)
            .send({ name: 'Taylor' })

        const participant = createParticipantResponse.body as ParticipantResponse

        const deleteResponse = await request(app)
            .delete(`/api/participants/${participant.id}`)
            .set('X-Event-Token', event.event.shareToken)

        expect(deleteResponse.status).toBe(403)
        expect(deleteResponse.body).toMatchObject({ error: { code: 'ADMIN_REQUIRED' } })
    })

    it('rejects cross-event participant, category, item, and assignment access with 404s', async () => {
        const { migrator, close } = await createMigrator()

        try {
            await migrator.up()
        } finally {
            await close()
        }

        const { app } = await import('../../server.js')

        const firstEventResponse = await request(app).post('/api/events').send({ name: 'Event A' })
        const secondEventResponse = await request(app).post('/api/events').send({ name: 'Event B' })

        const firstEvent = firstEventResponse.body as EventResponse
        const secondEvent = secondEventResponse.body as EventResponse

        const participantResponse = await request(app)
            .post('/api/participants')
            .set('X-Event-Token', secondEvent.event.shareToken)
            .send({ name: 'Jordan' })
        const participant = participantResponse.body as ParticipantResponse

        const categoryResponse = await request(app)
            .post('/api/categories')
            .set('X-Event-Token', secondEvent.event.adminToken)
            .send({ name: 'Drinks', sortOrder: 0 })
        const category = categoryResponse.body as { id: number }

        const itemResponse = await request(app)
            .post('/api/items')
            .set('X-Event-Token', secondEvent.event.shareToken)
            .send({ categoryId: category.id, createdBy: participant.id, name: 'Sodas', quantityRequired: 2 })
        const item = itemResponse.body as ItemResponse

        const assignmentResponse = await request(app)
            .post(`/api/items/${item.id}/assignments`)
            .set('X-Event-Token', secondEvent.event.shareToken)
            .send({ participantId: participant.id, quantity: 1 })
        const assignment = assignmentResponse.body as AssignmentResponse

        const crossEventParticipantResponse = await request(app)
            .patch(`/api/participants/${participant.id}`)
            .set('X-Event-Token', firstEvent.event.adminToken)
            .send({ name: 'Blocked' })

        expect(crossEventParticipantResponse.status).toBe(404)
        expect(crossEventParticipantResponse.body).toMatchObject({ error: { code: 'PARTICIPANT_NOT_IN_EVENT' } })

        const crossEventCategoryResponse = await request(app)
            .patch(`/api/categories/${category.id}`)
            .set('X-Event-Token', firstEvent.event.adminToken)
            .send({ name: 'Blocked' })

        expect(crossEventCategoryResponse.status).toBe(404)
        expect(crossEventCategoryResponse.body).toMatchObject({ error: { code: 'CATEGORY_NOT_IN_EVENT' } })

        const crossEventItemResponse = await request(app)
            .delete(`/api/items/${item.id}`)
            .set('X-Event-Token', firstEvent.event.adminToken)

        expect(crossEventItemResponse.status).toBe(404)
        expect(crossEventItemResponse.body).toMatchObject({ error: { code: 'ITEM_NOT_IN_EVENT' } })

        const crossEventAssignmentResponse = await request(app)
            .delete(`/api/assignments/${assignment.id}`)
            .set('X-Event-Token', firstEvent.event.adminToken)
            .send({})

        expect(crossEventAssignmentResponse.status).toBe(404)
        expect(crossEventAssignmentResponse.body).toMatchObject({ error: { code: 'ASSIGNMENT_NOT_IN_EVENT' } })
    })

    it('stores SQL injection strings as literal text without breaking later reads and writes', async () => {
        const { migrator, close } = await createMigrator()

        try {
            await migrator.up()
        } finally {
            await close()
        }

        const { app } = await import('../../server.js')
        const injectionValue = "Robert'); DROP TABLE event_items; --"

        const createEventResponse = await request(app).post('/api/events').send({ name: 'Injection Event' })
        const event = createEventResponse.body as EventResponse

        const participantResponse = await request(app)
            .post('/api/participants')
            .set('X-Event-Token', event.event.shareToken)
            .send({ name: injectionValue })

        expect(participantResponse.status).toBe(201)
        expect(participantResponse.body).toMatchObject({ name: injectionValue })

        const itemResponse = await request(app)
            .post('/api/items')
            .set('X-Event-Token', event.event.adminToken)
            .send({ name: injectionValue, quantityRequired: 1 })
        const item = itemResponse.body as ItemResponse

        expect(itemResponse.status).toBe(201)
        expect(itemResponse.body).toMatchObject({ name: injectionValue })

        const assignmentResponse = await request(app)
            .post(`/api/items/${item.id}/assignments`)
            .set('X-Event-Token', event.event.shareToken)
            .send({ participantId: (participantResponse.body as ParticipantResponse).id, quantity: 1, note: injectionValue })

        expect(assignmentResponse.status).toBe(201)
        expect(assignmentResponse.body).toMatchObject({ note: injectionValue })

        const listItemsResponse = await request(app)
            .get('/api/items')
            .set('X-Event-Token', event.event.shareToken)

        expect(listItemsResponse.status).toBe(200)
        expect(listItemsResponse.body).toEqual([
            expect.objectContaining({
                name: injectionValue,
                assignments: [expect.objectContaining({ note: injectionValue })],
            }),
        ])

        const followUpParticipantResponse = await request(app)
            .post('/api/participants')
            .set('X-Event-Token', event.event.shareToken)
            .send({ name: 'Still works' })

        expect(followUpParticipantResponse.status).toBe(201)
    })

    it('fails fast with a clear message when required env vars are missing', () => {
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null) => {
            throw new Error(`exit:${code}`)
        })
        const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)

        try {
            expect(() => loadEnv({})).toThrow('exit:1')
            expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid environment configuration:'))
            expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('DB_HOST'))
        } finally {
            exitSpy.mockRestore()
            stderrSpy.mockRestore()
        }
    })

    it('regression: migration env validation ignores unrelated runtime web config', () => {
        const dbEnv = loadDbEnv({
            NODE_ENV: 'production',
            DB_HOST: 'db',
            DB_PORT: '3306',
            DB_USER: 'listcollab_user',
            DB_PASSWORD: 'app_password',
            DB_NAME: 'listcollab',
            LOG_LEVEL: 'info',
        })

        expect(dbEnv).toMatchObject({
            DB_HOST: 'db',
            DB_PORT: 3306,
            DB_USER: 'listcollab_user',
            DB_PASSWORD: 'app_password',
            DB_NAME: 'listcollab',
            LOG_LEVEL: 'info',
            NODE_ENV: 'production',
        })
    })
})
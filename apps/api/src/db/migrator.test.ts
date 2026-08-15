import mysql from 'mysql2/promise'
import type { RowDataPacket } from 'mysql2/promise'
import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'

import { createMigrator } from './migrator.js'

const testDatabaseConfig = {
    host: '127.0.0.1',
    port: 3307,
    database: 'listcollab_test',
    user: 'listcollab_test_user',
    password: 'listcollab_test_password_only',
    rootPassword: 'test_root_password_only',
}

type TableNameRow = RowDataPacket & {
    Tables_in_listcollab_test: string
}

type MigrationNameRow = RowDataPacket & {
    name: string
}

type ImportedCountRow = RowDataPacket & {
    events_count: number
    participants_count: number
    categories_count: number
    items_count: number
    assignments_count: number
}

type EventIdRow = RowDataPacket & {
    id: number
}

type DeleteRuleRow = RowDataPacket & {
    constraint_name: string
    delete_rule: string
}

type TextColumnRow = RowDataPacket & {
    table_name: string
    column_name: string
    character_set_name: string | null
    collation_name: string | null
}

type NullabilityRow = RowDataPacket & {
    table_name: string
    column_name: string
    is_nullable: 'YES' | 'NO'
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

async function createAppConnection() {
    return createConnectionWithRetry({
        host: testDatabaseConfig.host,
        port: testDatabaseConfig.port,
        user: testDatabaseConfig.user,
        password: testDatabaseConfig.password,
        database: testDatabaseConfig.database,
        multipleStatements: true,
    })
}

async function getTableNames() {
    const connection = await createAppConnection()

    try {
        const [rows] = await connection.query<TableNameRow[]>('SHOW TABLES')
        return rows.map((row) => row.Tables_in_listcollab_test).sort()
    } finally {
        await connection.end()
    }
}

async function getMigrationNames() {
    const connection = await createAppConnection()

    try {
        const [rows] = await connection.query<MigrationNameRow[]>('SELECT name FROM schema_migrations ORDER BY name')
        return rows.map((row) => row.name)
    } finally {
        await connection.end()
    }
}

async function seedLegacyPartyData(): Promise<void> {
    const connection = await createAppConnection()

    try {
        await connection.query(`
      INSERT INTO categories (name, icon) VALUES ('Food', '🍽️');
      INSERT INTO people (name) VALUES ('Alice Johnson'), ('Bob Smith');
      INSERT INTO items (name, category_id, person_id) VALUES ('Pizza', 1, 1), ('Drinks', 1, 2);
      INSERT INTO required_items (name, category_id, person_id, is_fulfilled) VALUES ('Main Course', 1, NULL, FALSE), ('Dessert', 1, 1, TRUE);
    `)
    } finally {
        await connection.end()
    }
}

async function getImportedCounts() {
    const connection = await createAppConnection()

    try {
        const [rows] = await connection.query<ImportedCountRow[]>(`
      SELECT
        (SELECT COUNT(*) FROM events) AS events_count,
        (SELECT COUNT(*) FROM event_participants) AS participants_count,
        (SELECT COUNT(*) FROM event_categories) AS categories_count,
        (SELECT COUNT(*) FROM event_items) AS items_count,
        (SELECT COUNT(*) FROM event_item_assignments) AS assignments_count
    `)

        return rows[0]
    } finally {
        await connection.end()
    }
}

beforeEach(async () => {
    applyTestEnvironment()
    await resetTestDatabase()
})

describe('migration runner', () => {
    it('migrates an empty database to the latest schema', async () => {
        const { migrator, close } = await createMigrator()

        try {
            await migrator.up()
        } finally {
            await close()
        }

        expect(await getMigrationNames()).toEqual([
            '001_initial_schema',
            '002_events_categories_participants',
            '003_event_items_assignments',
            '004_migrate_legacy_party',
        ])

        expect(await getTableNames()).toEqual([
            'categories',
            'event_categories',
            'event_item_assignments',
            'event_items',
            'event_participants',
            'events',
            'items',
            'people',
            'required_items',
            'schema_migrations',
        ])
    })

    it('rolls back to 002 and re-migrates to latest', async () => {
        const { migrator, close } = await createMigrator()

        try {
            await migrator.up()
            await migrator.down()
            await migrator.down()

            expect(await getMigrationNames()).toEqual([
                '001_initial_schema',
                '002_events_categories_participants',
            ])

            await migrator.up()
        } finally {
            await close()
        }

        expect(await getMigrationNames()).toEqual([
            '001_initial_schema',
            '002_events_categories_participants',
            '003_event_items_assignments',
            '004_migrate_legacy_party',
        ])
    })

    it('imports the legacy party once and is idempotent on rerun', async () => {
        const { migrator, close } = await createMigrator()

        try {
            await migrator.up({ to: '003_event_items_assignments' })
            await seedLegacyPartyData()
            await migrator.up()

            expect(await getImportedCounts()).toEqual({
                events_count: 1,
                participants_count: 2,
                categories_count: 1,
                items_count: 4,
                assignments_count: 3,
            })

            await migrator.up()
        } finally {
            await close()
        }

        expect(await getImportedCounts()).toEqual({
            events_count: 1,
            participants_count: 2,
            categories_count: 1,
            items_count: 4,
            assignments_count: 3,
        })
    })

    it('leaves no imported rows on an empty legacy dataset', async () => {
        const { migrator, close } = await createMigrator()

        try {
            await migrator.up()
        } finally {
            await close()
        }

        expect(await getImportedCounts()).toEqual({
            events_count: 0,
            participants_count: 0,
            categories_count: 0,
            items_count: 0,
            assignments_count: 0,
        })
    })

    it('cascades deletes from an imported event to its child tables', async () => {
        const { migrator, close } = await createMigrator()

        try {
            await migrator.up({ to: '003_event_items_assignments' })
            await seedLegacyPartyData()
            await migrator.up()
        } finally {
            await close()
        }

        const connection = await createAppConnection()

        try {
            const [eventRows] = await connection.query<EventIdRow[]>(
                `SELECT id FROM events WHERE description = 'Imported from legacy PartyList data' LIMIT 1`
            )

            const eventId = eventRows[0]?.id
            expect(eventId).toBeDefined()

            await connection.execute('DELETE FROM events WHERE id = ?', [eventId])

            const [counts] = await connection.query<ImportedCountRow[]>(`
        SELECT
          (SELECT COUNT(*) FROM event_participants) AS participants_count,
          (SELECT COUNT(*) FROM event_categories) AS categories_count,
          (SELECT COUNT(*) FROM event_items) AS items_count,
          (SELECT COUNT(*) FROM event_item_assignments) AS assignments_count
      `)

            expect(counts[0]).toEqual({
                participants_count: 0,
                categories_count: 0,
                items_count: 0,
                assignments_count: 0,
            })
        } finally {
            await connection.end()
        }
    })

    it('rejects duplicate assignments and invalid quantities at the database layer', async () => {
        const { migrator, close } = await createMigrator()

        try {
            await migrator.up({ to: '003_event_items_assignments' })
        } finally {
            await close()
        }

        const connection = await createAppConnection()

        try {
            await connection.query(`
        INSERT INTO events (name, share_token, admin_token) VALUES ('Test Event', 'token-1234', 'admin-token');
        INSERT INTO event_participants (event_id, name) VALUES (1, 'Alice');
        INSERT INTO event_items (event_id, name, status) VALUES (1, 'Bread Rolls', 'open');
        INSERT INTO event_item_assignments (item_id, participant_id, quantity) VALUES (1, 1, 1);
      `)

            await expect(
                connection.execute(
                    'INSERT INTO event_item_assignments (item_id, participant_id, quantity) VALUES (?, ?, ?)',
                    [1, 1, 1]
                )
            ).rejects.toThrow()

            await expect(
                connection.execute(
                    'INSERT INTO event_item_assignments (item_id, participant_id, quantity) VALUES (?, ?, ?)',
                    [1, 1, 0]
                )
            ).rejects.toThrow()

            await expect(
                connection.execute(
                    'INSERT INTO event_item_assignments (item_id, participant_id, quantity) VALUES (?, ?, ?)',
                    [1, 1, -1]
                )
            ).rejects.toThrow()
        } finally {
            await connection.end()
        }
    })

    it('applies the expected delete rules, text collations, and not-null constraints', async () => {
        const { migrator, close } = await createMigrator()

        try {
            await migrator.up({ to: '003_event_items_assignments' })
        } finally {
            await close()
        }

        const connection = await createAppConnection()

        try {
            const [deleteRules] = await connection.query<DeleteRuleRow[]>(`
        SELECT rc.CONSTRAINT_NAME AS constraint_name, rc.DELETE_RULE AS delete_rule
        FROM information_schema.REFERENTIAL_CONSTRAINTS rc
        WHERE rc.CONSTRAINT_SCHEMA = DATABASE()
          AND rc.CONSTRAINT_NAME IN (
            'fk_event_participants_event_id',
            'fk_event_categories_event_id',
            'fk_event_items_event_id',
            'fk_event_items_category_id',
            'fk_event_items_created_by',
            'fk_event_item_assignments_item_id',
            'fk_event_item_assignments_participant_id'
          )
        ORDER BY rc.CONSTRAINT_NAME
      `)

            expect(
                Object.fromEntries(deleteRules.map((row) => [row.constraint_name, row.delete_rule]))
            ).toEqual({
                fk_event_categories_event_id: 'CASCADE',
                fk_event_item_assignments_item_id: 'CASCADE',
                fk_event_item_assignments_participant_id: 'CASCADE',
                fk_event_items_category_id: 'SET NULL',
                fk_event_items_created_by: 'SET NULL',
                fk_event_items_event_id: 'CASCADE',
                fk_event_participants_event_id: 'CASCADE',
            })

            const [textColumns] = await connection.query<TextColumnRow[]>(`
        SELECT table_name, column_name, character_set_name, collation_name
        FROM information_schema.COLUMNS
        WHERE table_schema = DATABASE()
          AND table_name IN ('events', 'event_participants', 'event_categories', 'event_items', 'event_item_assignments')
          AND data_type IN ('varchar', 'text', 'enum')
        ORDER BY table_name, column_name
      `)

            for (const column of textColumns) {
                expect(column.character_set_name).toBe('utf8mb4')
                expect(column.collation_name).toBe('utf8mb4_unicode_ci')
            }

            const [nullability] = await connection.query<NullabilityRow[]>(`
        SELECT table_name, column_name, is_nullable
        FROM information_schema.COLUMNS
        WHERE table_schema = DATABASE()
          AND (
            (table_name = 'event_participants' AND column_name = 'event_id') OR
            (table_name = 'event_categories' AND column_name = 'event_id') OR
            (table_name = 'event_items' AND column_name = 'event_id') OR
            (table_name = 'event_item_assignments' AND column_name IN ('item_id', 'participant_id', 'quantity'))
          )
        ORDER BY table_name, column_name
      `)

            for (const column of nullability) {
                expect(column.is_nullable).toBe('NO')
            }
        } finally {
            await connection.end()
        }
    })

    it('creates an event and returns both tokens once', async () => {
        const { migrator, close } = await createMigrator()

        try {
            await migrator.up()
        } finally {
            await close()
        }

        const { app } = await import('../../server.js')

        const response = await request(app).post('/api/events').send({
            name: 'Birthday Picnic',
            description: 'Bring snacks',
            categories: [{ name: 'Food', icon: '🍔', sortOrder: 0 }],
        })
        const body = response.body as { event: { shareToken: string; adminToken: string }; categories: unknown[] }

        expect(response.status).toBe(201)
        expect(body.event.shareToken).toHaveLength(10)
        expect(body.event.adminToken).toHaveLength(64)
        expect(body.categories).toHaveLength(1)
    })

    it('returns the aggregate event response without leaking the admin token', async () => {
        const { migrator, close } = await createMigrator()

        try {
            await migrator.up()
        } finally {
            await close()
        }

        const { app } = await import('../../server.js')

        const createResponse = await request(app).post('/api/events').send({
            name: 'Board Games Night',
            categories: [{ name: 'Games', icon: '🎲', sortOrder: 0 }],
        })
        const createBody = createResponse.body as { event: { shareToken: string } }

        const shareToken = createBody.event.shareToken

        const response = await request(app)
            .get(`/api/events/${shareToken}`)
            .set('X-Event-Token', shareToken)
        const body = response.body as { event: { shareToken: string; adminToken?: string }; items: unknown[] }

        expect(response.status).toBe(200)
        expect(body.event.shareToken).toBe(shareToken)
        expect(body.event.adminToken).toBeUndefined()
        expect(body.items).toEqual([])
    })

    it('updates an event only when the matching admin token is supplied', async () => {
        const { migrator, close } = await createMigrator()

        try {
            await migrator.up()
        } finally {
            await close()
        }

        const { app } = await import('../../server.js')

        const createResponse = await request(app).post('/api/events').send({
            name: 'Camp Weekend',
            description: 'Initial plan',
            location: 'Old location',
        })
        const createBody = createResponse.body as {
            event: { shareToken: string; adminToken: string }
        }

        const updateResponse = await request(app)
            .patch(`/api/events/${createBody.event.shareToken}`)
            .set('X-Event-Token', createBody.event.adminToken)
            .send({
                name: 'Camp Weekend Updated',
                description: 'Bring torches',
                location: 'Lakeside',
            })
        const updateBody = updateResponse.body as {
            event: { name: string; description: string | null; location: string | null; adminToken?: string }
        }

        expect(updateResponse.status).toBe(200)
        expect(updateBody.event).toMatchObject({
            name: 'Camp Weekend Updated',
            description: 'Bring torches',
            location: 'Lakeside',
        })
        expect(updateBody.event.adminToken).toBeUndefined()

        const forbiddenResponse = await request(app)
            .patch(`/api/events/${createBody.event.shareToken}`)
            .set('X-Event-Token', createBody.event.shareToken)
            .send({ name: 'Should Fail' })

        expect(forbiddenResponse.status).toBe(403)
        expect(forbiddenResponse.body).toMatchObject({
            error: { code: 'ADMIN_REQUIRED' },
        })
    })

    it('deletes an event and rejects cross-event admin token reuse on the route path', async () => {
        const { migrator, close } = await createMigrator()

        try {
            await migrator.up()
        } finally {
            await close()
        }

        const { app } = await import('../../server.js')

        const firstCreateResponse = await request(app).post('/api/events').send({
            name: 'First Event',
        })
        const secondCreateResponse = await request(app).post('/api/events').send({
            name: 'Second Event',
        })

        const firstEvent = firstCreateResponse.body as { event: { shareToken: string; adminToken: string } }
        const secondEvent = secondCreateResponse.body as { event: { shareToken: string; adminToken: string } }

        const mismatchedDeleteResponse = await request(app)
            .delete(`/api/events/${secondEvent.event.shareToken}`)
            .set('X-Event-Token', firstEvent.event.adminToken)

        expect(mismatchedDeleteResponse.status).toBe(404)
        expect(mismatchedDeleteResponse.body).toMatchObject({
            error: { code: 'EVENT_NOT_FOUND' },
        })

        const deleteResponse = await request(app)
            .delete(`/api/events/${firstEvent.event.shareToken}`)
            .set('X-Event-Token', firstEvent.event.adminToken)

        expect(deleteResponse.status).toBe(204)

        const fetchDeletedResponse = await request(app)
            .get(`/api/events/${firstEvent.event.shareToken}`)
            .set('X-Event-Token', firstEvent.event.shareToken)

        expect(fetchDeletedResponse.status).toBe(404)
        expect(fetchDeletedResponse.body).toMatchObject({
            error: { code: 'EVENT_NOT_FOUND' },
        })
    })
})
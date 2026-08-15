import crypto from 'node:crypto'
import { existsSync } from 'node:fs'
import path from 'node:path'

import type { Pool, RowDataPacket } from 'mysql2/promise'
import mysql from 'mysql2/promise'
import { Umzug } from 'umzug'

import logger from '../../logger.js'
import { getEnv } from '../config/env.js'

type MigrationRecord = RowDataPacket & {
  name: string
}

type LegacyImportSummaryRow = RowDataPacket & {
  id: number
  name: string
  participant_count: number
  category_count: number
  item_count: number
  assignment_count: number
}

function resolveDatabaseHost(): string {
  return getEnv().DB_HOST
}

function createPool(): Pool {
  const env = getEnv()

  return mysql.createPool({
    host: resolveDatabaseHost(),
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 1,
    queueLimit: 0,
    multipleStatements: true,
  })
}

async function ensureMigrationTable(pool: Pool): Promise<void> {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR(255) NOT NULL PRIMARY KEY,
      executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
}

async function readMigrationSql(filePath: string): Promise<string> {
  const { readFile } = await import('node:fs/promises')

  return readFile(filePath, 'utf8')
}

function createShareToken(): string {
  return crypto.randomBytes(8).toString('base64url').slice(0, 10)
}

function createAdminToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

function replacePlaceholders(sql: string, replacements: Record<string, string>): string {
  return Object.entries(replacements).reduce(
    (currentSql, [placeholder, value]) => currentSql.replaceAll(`{{${placeholder}}}`, value),
    sql
  )
}

async function logLegacyImportSummary(pool: Pool): Promise<void> {
  const [rows] = await pool.query<LegacyImportSummaryRow[]>(`
    SELECT
      e.id,
      e.name,
      (SELECT COUNT(*) FROM event_participants ep WHERE ep.event_id = e.id) AS participant_count,
      (SELECT COUNT(*) FROM event_categories ec WHERE ec.event_id = e.id) AS category_count,
      (SELECT COUNT(*) FROM event_items ei WHERE ei.event_id = e.id) AS item_count,
      (
        SELECT COUNT(*)
        FROM event_item_assignments eia
        JOIN event_items ei ON ei.id = eia.item_id
        WHERE ei.event_id = e.id
      ) AS assignment_count
    FROM events e
    WHERE e.description = 'Imported from legacy PartyList data'
    LIMIT 1
  `)

  const summary = rows[0]

  if (!summary) {
    return
  }

  logger.info(
    {
      eventId: summary.id,
      eventName: summary.name,
      participants: summary.participant_count,
      categories: summary.category_count,
      items: summary.item_count,
      assignments: summary.assignment_count,
    },
    'Legacy event import summary'
  )
}

function getMigrationName(fileName: string): string {
  return fileName.replace(/\.up\.sql$/, '')
}

const repoRoot = path.resolve(__dirname, '..', '..', '..', '..')

async function seedBaselineMigrationIfNeeded(pool: Pool, baselineName: string): Promise<boolean> {
  const [existingMigrations] = await pool.query<MigrationRecord[]>(
    'SELECT name FROM schema_migrations ORDER BY name'
  )

  if (existingMigrations.length > 0) {
    return false
  }

  const [tables] = await pool.query<RowDataPacket[]>(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
      AND table_name IN ('categories', 'people', 'items', 'required_items')
  `)

  if (tables.length === 0) {
    return false
  }

  await pool.execute('INSERT INTO schema_migrations (name) VALUES (?)', [baselineName])
  return true
}

export async function createMigrator() {
  const pool = createPool()
  const migrationsPath = path.resolve(repoRoot, 'apps/api/migrations')

  await ensureMigrationTable(pool)

  const migrator = new Umzug({
    migrations: {
      glob: path.join(migrationsPath, '*.up.sql'),
      resolve: ({ name, path: upPath }) => {
        if (!upPath) {
          throw new Error(`Migration ${name} is missing an up file path`)
        }

        const downPath = upPath.replace(/\.up\.sql$/, '.down.sql')

        if (!existsSync(downPath)) {
          throw new Error(`Migration ${name} is missing required down file: ${path.basename(downPath)}`)
        }

        const migrationName = getMigrationName(name)
        const replacements =
          migrationName === '004_migrate_legacy_party'
            ? {
              IMPORT_SHARE_TOKEN: createShareToken(),
              IMPORT_ADMIN_TOKEN: createAdminToken(),
            }
            : {}

        return {
          name: migrationName,
          up: async () => {
            const sql = replacePlaceholders(await readMigrationSql(upPath), replacements)
            await pool.query(sql)

            if (migrationName === '004_migrate_legacy_party') {
              await logLegacyImportSummary(pool)
            }
          },
          down: async () => {
            const sql = replacePlaceholders(await readMigrationSql(downPath), replacements)
            await pool.query(sql)
          },
        }
      },
    },
    storage: {
      executed: async () => {
        const [rows] = await pool.query<MigrationRecord[]>('SELECT name FROM schema_migrations ORDER BY name')
        return rows.map((row) => row.name)
      },
      logMigration: async ({ name }) => {
        await pool.execute(
          'INSERT INTO schema_migrations (name) VALUES (?) ON DUPLICATE KEY UPDATE name = VALUES(name)',
          [name]
        )
      },
      unlogMigration: async ({ name }) => {
        await pool.execute('DELETE FROM schema_migrations WHERE name = ?', [name])
      },
    },
    logger: undefined,
  })

  return {
    migrator,
    seedBaselineMigrationIfNeeded: async (baselineName: string) => seedBaselineMigrationIfNeeded(pool, baselineName),
    close: async () => {
      await pool.end()
    },
  }
}
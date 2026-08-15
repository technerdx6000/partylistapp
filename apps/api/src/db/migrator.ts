import path from 'node:path'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import type { Pool, RowDataPacket } from 'mysql2/promise'
import mysql from 'mysql2/promise'
import { Umzug } from 'umzug'

type MigrationRecord = RowDataPacket & {
  name: string
}

function resolveDatabaseHost(): string {
  return process.env.DB_HOST === 'db' ? '127.0.0.1' : process.env.DB_HOST ?? '127.0.0.1'
}

function createPool(): Pool {
  return mysql.createPool({
    host: resolveDatabaseHost(),
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? '',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? '',
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

function getMigrationName(fileName: string): string {
  return fileName.replace(/\.up\.sql$/, '')
}

const currentFilePath = fileURLToPath(import.meta.url)
const currentDirectory = path.dirname(currentFilePath)
const repoRoot = path.resolve(currentDirectory, '..', '..', '..', '..')

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

        return {
          name: getMigrationName(name),
          up: async () => {
            const sql = await readMigrationSql(upPath)
            await pool.query(sql)
          },
          down: async () => {
            const sql = await readMigrationSql(downPath)
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
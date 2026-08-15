import path from 'node:path'

import dotenv from 'dotenv'

import { createMigrator } from './migrator.js'
import logger from '../../logger.js'

const repoRoot = path.resolve(__dirname, '..', '..', '..', '..')

dotenv.config({ path: path.resolve(repoRoot, '.env') })
dotenv.config({ path: path.resolve(repoRoot, 'apps/api/.env') })

async function main() {
  const { migrator, seedBaselineMigrationIfNeeded, close } = await createMigrator()

  try {
    await seedBaselineMigrationIfNeeded('001_initial_schema')

    const pending = await migrator.pending()
    const result = await migrator.up()

    logger.info(
      {
        appliedCount: result.length,
        pendingMigrations: pending.map((migration) => migration.name),
      },
      'Applied migrations'
    )
  } finally {
    await close()
  }
}

void main()
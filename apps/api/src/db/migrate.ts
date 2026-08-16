import { createMigrator } from './migrator.js'
import logger, { configureLogger } from '../../logger.js'
import { getDbEnv } from '../config/env.js'

configureLogger(getDbEnv().LOG_LEVEL)

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
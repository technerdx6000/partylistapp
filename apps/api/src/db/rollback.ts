import { createMigrator } from './migrator.js'
import logger, { configureLogger } from '../../logger.js'
import { getEnv } from '../config/env.js'

configureLogger(getEnv().LOG_LEVEL)

async function main() {
  const { migrator, close } = await createMigrator()

  try {
    const result = await migrator.down()
    const rolledBack = result.length > 0 ? result[0]?.name ?? 'unknown' : 'none'

    logger.info({ rolledBack }, 'Rolled back migration')
  } finally {
    await close()
  }
}

void main()
import path from 'node:path'

import dotenv from 'dotenv'

import { createMigrator } from './migrator.js'
import logger from '../../logger.js'

const repoRoot = path.resolve(__dirname, '..', '..', '..', '..')

dotenv.config({ path: path.resolve(repoRoot, '.env') })
dotenv.config({ path: path.resolve(repoRoot, 'apps/api/.env') })

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
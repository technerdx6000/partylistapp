import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createMigrator } from './migrator.js'

const currentFilePath = fileURLToPath(import.meta.url)
const currentDirectory = path.dirname(currentFilePath)
const repoRoot = path.resolve(currentDirectory, '..', '..', '..', '..')

dotenv.config({ path: path.resolve(repoRoot, '.env') })
dotenv.config({ path: path.resolve(repoRoot, 'apps/api/.env') })

async function main() {
  const { migrator, close } = await createMigrator()

  try {
    const result = await migrator.down()
    const rolledBack = result.length > 0 ? result[0]?.name ?? 'unknown' : 'none'

    console.log(`Rolled back migration: ${rolledBack}`)
  } finally {
    await close()
  }
}

void main()
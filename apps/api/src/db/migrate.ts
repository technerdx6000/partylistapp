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
  const { migrator, seedBaselineMigrationIfNeeded, close } = await createMigrator()

  try {
    await seedBaselineMigrationIfNeeded('001_initial_schema')

    const pending = await migrator.pending()
    const result = await migrator.up()

    console.log(`Applied ${result.length} migration(s): ${pending.map((migration) => migration.name).join(', ') || 'none'}`)
  } finally {
    await close()
  }
}

void main()
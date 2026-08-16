import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

const sharedPackageAlias = fileURLToPath(new URL('./packages/shared/src/index.ts', import.meta.url))

const coverage = {
  provider: 'v8' as const,
  reporter: ['text', 'html'],
  include: [
    'apps/api/src/**/*.ts',
    'apps/api/server.ts',
    'apps/api/logger.ts',
    'apps/web/src/**/*.ts',
    'apps/web/src/**/*.tsx',
    'packages/shared/src/**/*.ts',
  ],
  exclude: [
    '**/*.test.ts',
    '**/*.test.tsx',
    'apps/**/dist/**',
    'packages/**/dist/**',
    'apps/api/test/**',
    'apps/api/src/db/migrate.ts',
    'apps/api/src/db/rollback.ts',
    'apps/web/src/main.tsx',
    'packages/shared/src/types.ts',
    'scripts/**',
  ],
  thresholds: {
    statements: 90,
    branches: 85,
    functions: 85,
    lines: 90,
  },
}

export default defineConfig({
  resolve: {
    alias: {
      '@listcollab/shared': sharedPackageAlias,
    },
  },
  test: {
    coverage,
    projects: [
      {
        resolve: {
          alias: {
            '@listcollab/shared': sharedPackageAlias,
          },
        },
        test: {
          name: 'shared',
          include: ['packages/shared/src/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        resolve: {
          alias: {
            '@listcollab/shared': sharedPackageAlias,
          },
        },
        test: {
          name: 'api',
          include: ['apps/api/**/*.test.ts'],
          exclude: ['apps/api/src/security/**/*.test.ts'],
          environment: 'node',
          fileParallelism: false,
          globalSetup: ['apps/api/test/globalSetup.ts'],
          maxWorkers: 1,
        },
      },
      {
        resolve: {
          alias: {
            '@listcollab/shared': sharedPackageAlias,
          },
        },
        test: {
          name: 'web',
          include: ['apps/web/src/**/*.test.ts', 'apps/web/src/**/*.test.tsx'],
          environment: 'jsdom',
          setupFiles: ['apps/web/test/setup.ts'],
        },
      },
    ],
  },
})
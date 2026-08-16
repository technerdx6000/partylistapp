import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

const sharedPackageAlias = fileURLToPath(new URL('./packages/shared/src/index.ts', import.meta.url))

const coverage = {
  provider: 'v8' as const,
  reporter: ['text', 'html'],
}

export default defineConfig({
  resolve: {
    alias: {
      '@listcollab/shared': sharedPackageAlias,
    },
  },
  test: {
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
          coverage,
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
          environment: 'node',
          fileParallelism: false,
          globalSetup: ['apps/api/test/globalSetup.ts'],
          maxWorkers: 1,
          coverage,
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
          coverage,
        },
      },
    ],
  },
})
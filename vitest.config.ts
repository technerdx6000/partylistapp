import { defineConfig } from 'vitest/config'

const coverage = {
  provider: 'v8' as const,
  reporter: ['text', 'html'],
}

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'shared',
          include: ['packages/shared/src/**/*.test.ts'],
          environment: 'node',
          coverage,
        },
      },
      {
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
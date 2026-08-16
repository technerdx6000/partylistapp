import { defineConfig, devices } from '@playwright/test'

const e2eMode = process.env.LISTCOLLAB_E2E_MODE ?? 'production'
const appPort = process.env.LISTCOLLAB_E2E_APP_PORT ?? (e2eMode === 'production' ? '4274' : '4273')
const apiPort = process.env.LISTCOLLAB_E2E_API_PORT ?? (e2eMode === 'production' ? '4302' : '4301')
const appUrl = process.env.LISTCOLLAB_E2E_APP_URL ?? `http://127.0.0.1:${appPort}`
const apiUrl = process.env.LISTCOLLAB_E2E_API_URL ?? `http://127.0.0.1:${apiPort}`

export default defineConfig({
    testDir: './e2e',
    use: {
        baseURL: appUrl,
    },
    webServer:
        e2eMode === 'development'
            ? [
                {
                    command: 'npm run --workspace @listcollab/web dev',
                    url: appUrl,
                    reuseExistingServer: true,
                    timeout: 120000,
                },
                {
                    command: `docker compose up -d db && until [ "$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' partylist-db 2>/dev/null)" = healthy ]; do echo 'waiting for partylist-db'; done && npm run db:migrate && npm run --workspace @listcollab/api dev`,
                    env: {
                        CORS_ORIGIN: appUrl,
                        DB_HOST: '127.0.0.1',
                        DB_PORT: '3306',
                        E2E_TEST: 'true',
                        LOG_LEVEL: 'info',
                        NODE_ENV: 'development',
                        PORT: apiPort,
                    },
                    url: `${apiUrl}/api/health`,
                    reuseExistingServer: true,
                    timeout: 180000,
                },
            ]
            : {
                command: 'node scripts/e2e-prod.mjs',
                url: appUrl,
                reuseExistingServer: false,
                timeout: 240000,
            },
    projects: [
        {
            name: 'mobile',
            use: { ...devices['Pixel 5'] },
        },
        {
            name: 'desktop',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
})
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
    testDir: './e2e',
    use: {
        baseURL: 'http://127.0.0.1:4273',
    },
    webServer: [
        {
            command: 'npm run --workspace @listcollab/web dev',
            url: 'http://127.0.0.1:4273',
            reuseExistingServer: true,
            timeout: 120000,
        },
        {
            command: "docker compose up -d db && until [ \"$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' partylist-db 2>/dev/null)\" = healthy ]; do echo 'waiting for partylist-db'; done && npm run db:migrate && npm run --workspace @listcollab/api dev",
            env: {
                CORS_ORIGIN: 'http://127.0.0.1:4273',
                DB_HOST: '127.0.0.1',
                DB_PORT: '3306',
                E2E_TEST: 'true',
                LOG_LEVEL: 'info',
                NODE_ENV: 'development',
            },
            url: 'http://127.0.0.1:4301/api/health',
            reuseExistingServer: true,
            timeout: 180000,
        },
    ],
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
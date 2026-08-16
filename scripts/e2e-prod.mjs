import { spawn, spawnSync } from 'node:child_process'
import path from 'node:path'

import dotenv from 'dotenv'

const repoRoot = path.resolve(import.meta.dirname, '..')

dotenv.config({ path: path.resolve(repoRoot, '.env') })
dotenv.config({ path: path.resolve(repoRoot, 'apps/api/.env') })

const sharedEnv = {
    ...process.env,
    E2E_TEST: 'true',
    NODE_ENV: 'production',
    PORT: process.env.LISTCOLLAB_E2E_API_PORT ?? '4302',
    DB_HOST: process.env.DB_HOST ?? '127.0.0.1',
    DB_PORT: process.env.DB_PORT ?? '3306',
    DB_NAME: process.env.DB_NAME ?? 'listcollab',
    DB_USER: process.env.DB_USER ?? 'listcollab_user',
    DB_PASSWORD: process.env.DB_PASSWORD ?? 'replace_with_generated_app_password',
    CORS_ORIGIN: process.env.LISTCOLLAB_E2E_APP_URL ?? 'http://127.0.0.1:4274',
    LISTCOLLAB_WEB_PROXY_TARGET: process.env.LISTCOLLAB_E2E_API_URL ?? 'http://127.0.0.1:4302',
    LOG_LEVEL: process.env.LOG_LEVEL ?? 'info',
}

function runOrExit(command, args, options = {}) {
    const result = spawnSync(command, args, {
        cwd: repoRoot,
        stdio: 'inherit',
        env: sharedEnv,
        ...options,
    })

    if (result.status !== 0) {
        process.exit(result.status ?? 1)
    }
}

async function wait(ms) {
    await new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForDatabaseHealth() {
    for (let attempt = 0; attempt < 90; attempt += 1) {
        const inspectResult = spawnSync(
            'docker',
            ['inspect', '-f', '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}', 'partylist-db'],
            { cwd: repoRoot, encoding: 'utf8' }
        )

        if (inspectResult.status === 0 && inspectResult.stdout.trim() === 'healthy') {
            return
        }

        await wait(1000)
    }

    throw new Error('Timed out waiting for partylist-db to become healthy')
}

function spawnPersistent(command, args) {
    return spawn(command, args, {
        cwd: repoRoot,
        stdio: 'inherit',
        env: sharedEnv,
    })
}

async function main() {
    runOrExit('docker', ['compose', 'up', '-d', 'db'])
    await waitForDatabaseHealth()
    runOrExit('npm', ['run', 'build'])
    runOrExit('npm', ['run', '--workspace', '@listcollab/api', 'db:migrate:prod'])

    const apiProcess = spawnPersistent('npm', ['run', '--workspace', '@listcollab/api', 'start'])
    const webProcess = spawnPersistent('npm', [
        'run',
        '--workspace',
        '@listcollab/web',
        'preview',
        '--',
        '--host',
        '127.0.0.1',
        '--port',
        process.env.LISTCOLLAB_E2E_APP_PORT ?? '4274',
        '--strictPort',
    ])

    const shutdown = (signal) => {
        apiProcess.kill(signal)
        webProcess.kill(signal)
    }

    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)

    const exitWithCode = (code) => {
        if (!webProcess.killed) {
            webProcess.kill('SIGTERM')
        }

        if (!apiProcess.killed) {
            apiProcess.kill('SIGTERM')
        }

        process.exit(code ?? 0)
    }

    apiProcess.on('exit', exitWithCode)
    webProcess.on('exit', exitWithCode)
}

void main()
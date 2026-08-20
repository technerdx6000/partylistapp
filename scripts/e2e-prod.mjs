import { spawn, spawnSync } from 'node:child_process'
import path from 'node:path'

import dotenv from 'dotenv'

const repoRoot = path.resolve(import.meta.dirname, '..')
const testComposeFile = path.resolve(repoRoot, 'docker-compose.test.yml')
const testDbService = 'test-db'

dotenv.config({ path: path.resolve(repoRoot, '.env') })
dotenv.config({ path: path.resolve(repoRoot, 'apps/api/.env') })

const sharedEnv = {
    ...process.env,
    E2E_TEST: 'true',
    NODE_ENV: 'production',
    PORT: process.env.LISTCOLLAB_E2E_API_PORT ?? '4302',
    DB_HOST: process.env.LISTCOLLAB_E2E_DB_HOST ?? '127.0.0.1',
    DB_PORT: process.env.LISTCOLLAB_E2E_DB_PORT ?? '3307',
    DB_NAME: process.env.LISTCOLLAB_E2E_DB_NAME ?? 'listcollab_test',
    DB_USER: process.env.LISTCOLLAB_E2E_DB_USER ?? 'listcollab_test_user',
    DB_PASSWORD: process.env.LISTCOLLAB_E2E_DB_PASSWORD ?? 'listcollab_test_password_only',
    CORS_ORIGIN: process.env.LISTCOLLAB_E2E_APP_URL ?? 'http://127.0.0.1:4274',
    LISTCOLLAB_WEB_PROXY_TARGET: process.env.LISTCOLLAB_E2E_API_URL ?? 'http://127.0.0.1:4302',
    LOG_LEVEL: process.env.LOG_LEVEL ?? 'info',
}

const testComposeArgs = ['compose', '-f', testComposeFile]

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

function getTestDbContainerId() {
    const composeResult = spawnSync('docker', [...testComposeArgs, 'ps', '-q', testDbService], {
        cwd: repoRoot,
        encoding: 'utf8',
    })

    if (composeResult.status !== 0) {
        return ''
    }

    return composeResult.stdout.trim()
}

async function waitForDatabaseHealth() {
    for (let attempt = 0; attempt < 90; attempt += 1) {
        const testDbContainerId = getTestDbContainerId()

        if (testDbContainerId.length === 0) {
            await wait(1000)
            continue
        }

        const inspectResult = spawnSync(
            'docker',
            ['inspect', '-f', '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}', testDbContainerId],
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

function teardownTestDatabase() {
    spawnSync('docker', [...testComposeArgs, 'down', '-v', '--remove-orphans'], {
        cwd: repoRoot,
        stdio: 'inherit',
        env: sharedEnv,
    })
}

async function main() {
    teardownTestDatabase()
    runOrExit('docker', [...testComposeArgs, 'up', '-d', testDbService])
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

        teardownTestDatabase()

        process.exit(code ?? 0)
    }

    apiProcess.on('exit', exitWithCode)
    webProcess.on('exit', exitWithCode)
}

void main()
import { spawn, spawnSync } from 'node:child_process'

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function waitForDatabaseHealth() {
    for (let attempt = 0; attempt < 90; attempt += 1) {
        const inspectResult = spawnSync(
            'docker',
            ['inspect', '-f', '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}', 'partylist-db'],
            { encoding: 'utf8' }
        )

        if (inspectResult.status === 0 && inspectResult.stdout.trim() === 'healthy') {
            return
        }

        await wait(1000)
    }

    throw new Error('Timed out waiting for partylist-db to become healthy')
}

const composeResult = spawnSync('docker', ['compose', 'up', '-d', 'db'], {
    stdio: 'inherit',
})

if (composeResult.status !== 0) {
    process.exit(composeResult.status ?? 1)
}

await waitForDatabaseHealth()

const migrateResult = spawnSync('npm', ['run', 'db:migrate'], {
    stdio: 'inherit',
})

if (migrateResult.status !== 0) {
    process.exit(migrateResult.status ?? 1)
}

const turboProcess = spawn('npx', ['turbo', 'run', 'dev', '--parallel'], {
    stdio: 'inherit',
})

const forwardSignal = (signal) => {
    turboProcess.kill(signal)
}

process.on('SIGINT', forwardSignal)
process.on('SIGTERM', forwardSignal)

turboProcess.on('exit', (code) => {
    process.exit(code ?? 0)
})
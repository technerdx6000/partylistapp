import { execFileSync } from 'node:child_process'
import path from 'node:path'

const repoRoot = path.resolve(__dirname, '..', '..', '..')

export default function globalSetup() {
    execFileSync('docker', ['compose', '-f', 'docker-compose.test.yml', 'up', '-d', '--wait'], {
        cwd: repoRoot,
        stdio: 'inherit',
    })

    return () => {
        execFileSync('docker', ['compose', '-f', 'docker-compose.test.yml', 'down', '-v', '--remove-orphans'], {
            cwd: repoRoot,
            stdio: 'inherit',
        })
    }
}
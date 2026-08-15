import path from 'node:path'

import dotenv from 'dotenv'
import { z } from 'zod'

const repoRoot = path.resolve(__dirname, '..', '..', '..', '..')

dotenv.config({ path: path.resolve(repoRoot, '.env') })
dotenv.config({ path: path.resolve(repoRoot, 'apps/api/.env') })

const EnvSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']),
    PORT: z.coerce.number().int().min(1).max(65535),
    DB_HOST: z.string().min(1),
    DB_PORT: z.coerce.number().int().min(1).max(65535),
    DB_USER: z.string().min(1),
    DB_PASSWORD: z.string().min(1),
    DB_NAME: z.string().min(1),
    CORS_ORIGIN: z.string().url(),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']),
})

export type AppEnv = Readonly<z.infer<typeof EnvSchema>>

let cachedEnv: AppEnv | undefined

/**
 * Parses and validates API environment configuration, exiting the process when required settings are invalid.
 */
export function loadEnv(rawEnv: NodeJS.ProcessEnv = process.env): AppEnv {
    const result = EnvSchema.safeParse(rawEnv)

    if (!result.success) {
        const invalidKeys = [...new Set(result.error.issues.map((issue) => String(issue.path[0] ?? 'unknown')))]
        process.stderr.write(`Invalid environment configuration: ${invalidKeys.join(', ')}\n`)
        process.exit(1)
    }

    return Object.freeze(result.data)
}

/**
 * Returns the cached API environment configuration, loading and freezing it on first access.
 */
export function getEnv(): AppEnv {
    if (!cachedEnv) {
        cachedEnv = loadEnv()
    }

    return cachedEnv
}
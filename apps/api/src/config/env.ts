import path from 'node:path'

import dotenv from 'dotenv'
import { z } from 'zod'

const repoRoot = path.resolve(__dirname, '..', '..', '..', '..')

dotenv.config({ path: path.resolve(repoRoot, '.env') })
dotenv.config({ path: path.resolve(repoRoot, 'apps/api/.env') })

const DbEnvSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']),
    DB_HOST: z.string().min(1),
    DB_PORT: z.coerce.number().int().min(1).max(65535),
    DB_USER: z.string().min(1),
    DB_PASSWORD: z.string().min(1),
    DB_NAME: z.string().min(1),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']),
})

const EnvSchema = DbEnvSchema.extend({
    E2E_TEST: z.enum(['true', 'false']).optional(),
    PORT: z.coerce.number().int().min(1).max(65535),
    CORS_ORIGIN: z.string().url(),
})

export type AppEnv = Readonly<z.infer<typeof EnvSchema>>
export type DbEnv = Readonly<z.infer<typeof DbEnvSchema>>

let cachedEnv: AppEnv | undefined
let cachedDbEnv: DbEnv | undefined

function parseEnv<T extends z.ZodTypeAny>(schema: T, rawEnv: NodeJS.ProcessEnv): z.infer<T> {
    const result = schema.safeParse(rawEnv)

    if (!result.success) {
        const invalidKeys = [...new Set(result.error.issues.map((issue) => String(issue.path[0] ?? 'unknown')))]
        process.stderr.write(`Invalid environment configuration: ${invalidKeys.join(', ')}\n`)
        process.exit(1)
    }

    return Object.freeze(result.data)
}

/**
 * Parses and validates API environment configuration, exiting the process when required settings are invalid.
 */
export function loadEnv(rawEnv: NodeJS.ProcessEnv = process.env): AppEnv {
    return parseEnv(EnvSchema, rawEnv)
}

/**
 * Parses and validates the environment required by migration and rollback scripts.
 */
export function loadDbEnv(rawEnv: NodeJS.ProcessEnv = process.env): DbEnv {
    return parseEnv(DbEnvSchema, rawEnv)
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

/**
 * Returns the cached database-script environment configuration.
 */
export function getDbEnv(): DbEnv {
    if (!cachedDbEnv) {
        cachedDbEnv = loadDbEnv()
    }

    return cachedDbEnv
}
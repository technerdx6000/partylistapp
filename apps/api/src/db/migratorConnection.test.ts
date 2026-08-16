import { describe, expect, it, vi } from 'vitest'

import { isRetryableDatabaseError, runWithDatabaseStartupRetry } from './migrator.js'

describe('runWithDatabaseStartupRetry', () => {
    it('retries transient database startup failures until the operation succeeds', async () => {
        const operation = vi
            .fn<() => Promise<string>>()
            .mockRejectedValueOnce(Object.assign(new Error('connection refused'), { code: 'ECONNREFUSED' }))
            .mockRejectedValueOnce(Object.assign(new Error('access denied'), { code: 'ER_ACCESS_DENIED_ERROR' }))
            .mockResolvedValue('ready')

        const sleep = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)

        await expect(
            runWithDatabaseStartupRetry(operation, {
                maxAttempts: 3,
                delayMs: 1,
                sleep,
            })
        ).resolves.toBe('ready')

        expect(operation).toHaveBeenCalledTimes(3)
        expect(sleep).toHaveBeenCalledTimes(2)
    })

    it('does not retry non-transient database failures', async () => {
        const operation = vi
            .fn<() => Promise<string>>()
            .mockRejectedValueOnce(Object.assign(new Error('syntax error'), { code: 'ER_PARSE_ERROR' }))

        const sleep = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)

        await expect(
            runWithDatabaseStartupRetry(operation, {
                maxAttempts: 3,
                delayMs: 1,
                sleep,
            })
        ).rejects.toMatchObject({ code: 'ER_PARSE_ERROR' })

        expect(operation).toHaveBeenCalledTimes(1)
        expect(sleep).not.toHaveBeenCalled()
    })
})

describe('isRetryableDatabaseError', () => {
    it('returns false for values without a retryable database error code', () => {
        expect(isRetryableDatabaseError(new Error('plain error'))).toBe(false)
        expect(isRetryableDatabaseError({ code: 'ER_PARSE_ERROR' })).toBe(false)
        expect(isRetryableDatabaseError('not-an-error')).toBe(false)
    })
})
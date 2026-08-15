import { PassThrough } from 'node:stream'

import { afterEach, describe, expect, it } from 'vitest'

import { createLogger } from './logger.js'

describe('logger redaction', () => {
    const output = new PassThrough()
    let buffer = ''

    output.on('data', (chunk: Buffer) => {
        buffer += chunk.toString()
    })

    afterEach(() => {
        buffer = ''
    })

    it('redacts event tokens and cookies from structured request logs', () => {
        const logger = createLogger(output)

        logger.info(
            {
                req: {
                    headers: {
                        'x-event-token': 'super-secret-token',
                        cookie: 'session=cookie-value',
                    },
                },
            },
            'request'
        )

        expect(buffer).not.toContain('super-secret-token')
        expect(buffer).not.toContain('cookie-value')
        expect(buffer).toContain('[REDACTED]')
    })
})
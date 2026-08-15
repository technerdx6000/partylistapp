import type { NextFunction, Request, Response } from 'express'
import { customAlphabet } from 'nanoid'

import logger from '../../logger.js'

const generateRequestId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 12)

/**
 * Assigns a request id and logs the request outcome with duration when the response finishes.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
    const startedAt = Date.now()
    req.requestId = generateRequestId()

    res.on('finish', () => {
        logger.info(
            {
                requestId: req.requestId,
                method: req.method,
                path: req.originalUrl,
                statusCode: res.statusCode,
                durationMs: Date.now() - startedAt,
                req: {
                    headers: req.headers,
                },
            },
            'HTTP request complete'
        )
    })

    next()
}
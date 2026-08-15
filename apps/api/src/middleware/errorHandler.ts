import type { NextFunction, Request, Response } from 'express'

import logger from '../../logger.js'
import { getEnv } from '../config/env.js'
import { AppError } from '../errors/AppError.js'

const env = getEnv()

/**
 * Converts thrown errors into the API error envelope with request ids and production-safe messages.
 */
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
    void next

    const appError = err instanceof AppError
        ? err
        : new AppError(500, 'INTERNAL_ERROR', 'Something went wrong')

    logger.error(
        {
            requestId: req.requestId,
            err,
            code: appError.code,
            details: appError.details,
        },
        'Unhandled API error'
    )

    const message =
        appError.statusCode >= 500 && env.NODE_ENV === 'production'
            ? 'Something went wrong'
            : appError.message

    res.status(appError.statusCode).json({
        error: {
            code: appError.code,
            message,
            requestId: req.requestId ?? 'unknown',
        },
    })
}
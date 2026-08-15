import type { RequestHandler } from 'express'

/**
 * Wraps an async Express handler so rejected promises always reach the error middleware.
 */
export function asyncHandler<T extends RequestHandler>(
    handler: T
): RequestHandler {
    return (req, res, next) => {
        void Promise.resolve(handler(req, res, next)).catch(next)
    }
}
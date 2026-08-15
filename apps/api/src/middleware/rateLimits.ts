import rateLimit from 'express-rate-limit'

import { getEnv } from '../config/env.js'

const env = getEnv()
const isTestEnvironment = env.NODE_ENV === 'test'

function createLimiter(limit: number) {
    return rateLimit({
        windowMs: 60_000,
        limit: isTestEnvironment ? 1_000 : limit,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        handler: (req, res) => {
            res.status(429).json({
                error: {
                    code: 'RATE_LIMITED',
                    message: 'Too many requests',
                    requestId: req.requestId ?? 'unknown',
                },
            })
        },
    })
}

export const generalRateLimit = createLimiter(300)
export const eventCreateRateLimit = createLimiter(30)
export const tokenResolutionRateLimit = createLimiter(30)
export const participantCreateRateLimit = createLimiter(30)
import type { NextFunction, Request, Response } from 'express'

import {
    findEventByAdminToken,
    findEventByShareToken,
} from '../repositories/eventRepository.js'
import { tokensEqual } from '../services/tokenService.js'

const SHARE_TOKEN_LENGTH = 10
const ADMIN_TOKEN_LENGTH = 64

function sendTokenError(
    res: Response,
    req: Request,
    statusCode: number,
    code: 'INVALID_TOKEN' | 'EVENT_NOT_FOUND' | 'ADMIN_REQUIRED',
    message: string
): void {
    res.status(statusCode).json({
        error: {
            code,
            message,
            requestId: req.requestId ?? 'unknown',
        },
    })
}

/**
 * Resolves the current event from the X-Event-Token header and records whether the caller is using admin access.
 */
export async function requireEventToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    const tokenHeader = req.header('X-Event-Token')

    if (!tokenHeader) {
        sendTokenError(res, req, 401, 'INVALID_TOKEN', 'Missing event token')
        return
    }

    let event = null
    let isAdmin = false

    if (tokenHeader.length === SHARE_TOKEN_LENGTH) {
        event = await findEventByShareToken(tokenHeader)
        isAdmin = false
    } else if (tokenHeader.length === ADMIN_TOKEN_LENGTH) {
        event = await findEventByAdminToken(tokenHeader)
        isAdmin = event ? tokensEqual(event.adminToken, tokenHeader) : false
    }

    if (!event) {
        sendTokenError(res, req, 404, 'EVENT_NOT_FOUND', 'Event not found')
        return
    }

    req.event = {
        id: event.id,
        isAdmin,
        shareToken: event.shareToken,
        event,
    }

    next()
}

/**
 * Rejects non-admin callers after event-token resolution has attached the current event context.
 */
export function requireAdminToken(req: Request, res: Response, next: NextFunction): void {
    if (!req.event?.isAdmin) {
        sendTokenError(res, req, 403, 'ADMIN_REQUIRED', 'Admin token required')
        return
    }

    next()
}
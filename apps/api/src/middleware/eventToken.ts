import type { NextFunction, Request, Response } from 'express'

import {
  findEventByAdminToken,
  findEventByShareToken,
} from '../repositories/eventRepository.js'
import { tokensEqual } from '../services/tokenService.js'

const SHARE_TOKEN_LENGTH = 10
const ADMIN_TOKEN_LENGTH = 64

/**
 * Resolves the current event from the X-Event-Token header and records whether the caller is using admin access.
 */
export async function requireEventToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  const tokenHeader = req.header('X-Event-Token')

  if (!tokenHeader) {
    res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Missing event token' } })
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
    res.status(404).json({ error: { code: 'EVENT_NOT_FOUND', message: 'Event not found' } })
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
    res.status(403).json({ error: { code: 'ADMIN_REQUIRED', message: 'Admin token required' } })
    return
  }

  next()
}
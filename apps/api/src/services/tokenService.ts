import { randomBytes, timingSafeEqual } from 'node:crypto'

import { customAlphabet } from 'nanoid'

const generateShareTokenValue = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_', 10)

/**
 * Generates a short URL-safe share token for participant access.
 */
export function generateShareToken(): string {
    return generateShareTokenValue()
}

/**
 * Generates the long admin token used for organiser-only capabilities.
 */
export function generateAdminToken(): string {
    return randomBytes(32).toString('hex')
}

/**
 * Compares two token strings using a constant-time equality check when lengths match.
 */
export function tokensEqual(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left)
    const rightBuffer = Buffer.from(right)

    if (leftBuffer.length !== rightBuffer.length) {
        return false
    }

    return timingSafeEqual(leftBuffer, rightBuffer)
}
import { afterEach, describe, expect, it, vi } from 'vitest'

import { generateAdminToken, generateShareToken, tokensEqual } from './tokenService.js'

afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
    vi.unmock('node:crypto')
    vi.unmock('nanoid')
})

describe('tokenService', () => {
    it('generates a 10-character share token', () => {
        expect(generateShareToken()).toHaveLength(10)
    })

    it('generates a 64-character admin token', () => {
        expect(generateAdminToken()).toHaveLength(64)
    })

    it('compares equal-length tokens in constant-time-safe form', () => {
        expect(tokensEqual('abcdefghij', 'abcdefghij')).toBe(true)
        expect(tokensEqual('abcdefghij', 'abcdefghik')).toBe(false)
    })

    it('rejects different token lengths immediately', () => {
        expect(tokensEqual('short', 'much-longer-token')).toBe(false)
    })

    it('uses timingSafeEqual for equal-length token comparisons', async () => {
        const timingSafeEqualMock = vi.fn(() => true)

        vi.resetModules()
        vi.doMock('node:crypto', () => ({
            randomBytes: vi.fn(),
            timingSafeEqual: timingSafeEqualMock,
        }))

        const { tokensEqual: mockedTokensEqual } = await import('./tokenService.js')

        expect(mockedTokensEqual('abcdefghij', 'abcdefghij')).toBe(true)
        expect(timingSafeEqualMock).toHaveBeenCalledOnce()
    })

    it('does not call timingSafeEqual when token lengths differ', async () => {
        const timingSafeEqualMock = vi.fn(() => true)

        vi.resetModules()
        vi.doMock('node:crypto', () => ({
            randomBytes: vi.fn(),
            timingSafeEqual: timingSafeEqualMock,
        }))

        const { tokensEqual: mockedTokensEqual } = await import('./tokenService.js')

        expect(mockedTokensEqual('short', 'much-longer-token')).toBe(false)
        expect(timingSafeEqualMock).not.toHaveBeenCalled()
    })

    it('generates unique share tokens across 10,000 generations', () => {
        const tokens = new Set(Array.from({ length: 10_000 }, () => generateShareToken()))

        expect(tokens.size).toBe(10_000)
    })

    it('generates unique admin tokens across 10,000 generations', () => {
        const tokens = new Set(Array.from({ length: 10_000 }, () => generateAdminToken()))

        expect(tokens.size).toBe(10_000)
    })

    it('draws admin tokens from crypto.randomBytes', async () => {
        const randomBytesMock = vi.fn(() => Buffer.from('ab'.repeat(32), 'hex'))

        vi.resetModules()
        vi.doMock('node:crypto', () => ({
            randomBytes: randomBytesMock,
            timingSafeEqual: vi.fn(),
        }))

        const { generateAdminToken: mockedGenerateAdminToken } = await import('./tokenService.js')

        expect(mockedGenerateAdminToken()).toBe('ab'.repeat(32))
        expect(randomBytesMock).toHaveBeenCalledWith(32)
    })
})
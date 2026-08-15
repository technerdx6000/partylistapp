import { describe, expect, it } from 'vitest'

import { generateAdminToken, generateShareToken, tokensEqual } from './tokenService.js'

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
})
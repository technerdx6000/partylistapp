import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { resolveRepoRoot } from './migrator.js'

describe('resolveRepoRoot', () => {
    it('returns the workspace root from the source db directory layout', () => {
        const sourceDir = path.resolve(process.cwd(), 'apps/api/src/db')

        expect(resolveRepoRoot(sourceDir)).toBe(process.cwd())
    })

    it('returns the workspace root from the compiled dist db directory layout', () => {
        const distDir = path.resolve(process.cwd(), 'apps/api/dist/src/db')

        expect(resolveRepoRoot(distDir)).toBe(process.cwd())
    })
})
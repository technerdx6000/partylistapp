import { describe, expect, it } from 'vitest'

import { calculateCoverage } from './coverage'

describe('calculateCoverage', () => {
    it('returns open coverage when required quantity remains', () => {
        expect(calculateCoverage(4, [1, 2])).toEqual({
            required: 4,
            claimed: 3,
            remaining: 1,
            status: 'open',
        })
    })

    it('returns covered when claimed quantity meets the requirement', () => {
        expect(calculateCoverage(4, [2, 2])).toEqual({
            required: 4,
            claimed: 4,
            remaining: 0,
            status: 'covered',
        })
    })

    it('does not mark null requirements as covered when nothing is claimed', () => {
        expect(calculateCoverage(null, [])).toEqual({
            required: null,
            claimed: 0,
            remaining: null,
            status: 'open',
        })
    })

    it('marks null requirements as completed when contributions exist', () => {
        expect(calculateCoverage(null, [1, 2])).toEqual({
            required: null,
            claimed: 3,
            remaining: null,
            status: 'completed',
        })
    })
})
import type { EventItem } from '@listcollab/shared'
import { describe, expect, it } from 'vitest'

import { assertCanCreateItem, authorizeItemUpdate } from './itemService.js'
import { AppError } from '../errors/AppError.js'

function buildItem(overrides: Partial<EventItem> = {}): EventItem {
    return {
        id: 1,
        eventId: 1,
        categoryId: 2,
        name: 'Bread Rolls',
        description: 'Bring a dozen',
        quantityRequired: 2,
        status: 'open',
        createdBy: 4,
        createdAt: '2026-08-15T00:00:00.000Z',
        updatedAt: '2026-08-15T00:00:00.000Z',
        ...overrides,
    }
}

describe('item service permissions', () => {
    it('allows admins to change structural item fields', () => {
        const changes = authorizeItemUpdate(
            buildItem(),
            { categoryId: 3, quantityRequired: 4, status: 'covered' },
            true
        )

        expect(changes).toEqual({ categoryId: 3, quantityRequired: 4, status: 'covered' })
    })

    it('allows share-token viewers to change structural item fields', () => {
        const changes = authorizeItemUpdate(
            buildItem(),
            { categoryId: 3, quantityRequired: 4, status: 'covered' },
            false
        )

        expect(changes).toEqual({ categoryId: 3, quantityRequired: 4, status: 'covered' })
    })

    it('allows share-token viewers to edit item text without participant identity', () => {
        const changes = authorizeItemUpdate(buildItem(), { name: 'Buns', description: 'Bring eight' }, false)

        expect(changes).toEqual({ name: 'Buns', description: 'Bring eight' })
    })

    it('ignores participantId when applying item updates', () => {
        const changes = authorizeItemUpdate(buildItem({ createdBy: 9 }), { participantId: 4, name: 'Buns' }, false)

        expect(changes).toEqual({ name: 'Buns' })
    })

    it('requires createdBy for guest item creation', () => {
        expect(() =>
            assertCanCreateItem({ name: 'Napkins', quantityRequired: null }, false)
        ).toThrowError(
            new AppError(400, 'VALIDATION_FAILED', 'Guest item creation requires a participant id', {
                fields: ['createdBy'],
            })
        )
    })

    it('allows admin item creation without createdBy', () => {
        expect(() => assertCanCreateItem({ name: 'Napkins', quantityRequired: null }, true)).not.toThrow()
    })
})
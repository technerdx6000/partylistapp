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

    it('rejects guest structural item changes with ADMIN_REQUIRED', () => {
        expect(() =>
            authorizeItemUpdate(buildItem(), { quantityRequired: 4, participantId: 4 }, false)
        ).toThrowError(new AppError(403, 'ADMIN_REQUIRED', 'Admin token required'))
    })

    it('rejects guest updates with no editable fields', () => {
        expect(() => authorizeItemUpdate(buildItem(), { participantId: 4 }, false)).toThrowError(
            new AppError(
                400,
                'VALIDATION_FAILED',
                'Guest item updates must include a name or description',
                { fields: ['name', 'description'] }
            )
        )
    })

    it('rejects guest updates without participant identity', () => {
        expect(() => authorizeItemUpdate(buildItem(), { name: 'Buns' }, false)).toThrowError(
            new AppError(
                400,
                'VALIDATION_FAILED',
                'Participant id is required for guest item updates',
                { fields: ['participantId'] }
            )
        )
    })

    it('rejects guest edits for items they did not create', () => {
        expect(() =>
            authorizeItemUpdate(buildItem({ createdBy: 9 }), { participantId: 4, name: 'Buns' }, false)
        ).toThrowError(new AppError(403, 'ITEM_EDIT_FORBIDDEN', 'Only the item creator can edit this item'))
    })

    it('allows guests to edit their own item name and description only', () => {
        const changes = authorizeItemUpdate(
            buildItem({ createdBy: 4 }),
            { participantId: 4, name: 'Buns', description: 'Bring eight' },
            false
        )

        expect(changes).toEqual({ name: 'Buns', description: 'Bring eight' })
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
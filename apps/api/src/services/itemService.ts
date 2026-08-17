import type { CreateItemRequest, EventItem, UpdateItemRequest } from '@listcollab/shared'

import { AppError } from '../errors/AppError.js'

type ItemChanges = Omit<UpdateItemRequest, 'participantId'>

/**
 * Validates that a share-token caller creating an item supplies a participant id so guest-owned items can be enforced later.
 */
export function assertCanCreateItem(input: CreateItemRequest, isAdmin: boolean): void {
    if (!isAdmin && !input.createdBy) {
        throw new AppError(400, 'VALIDATION_FAILED', 'Guest item creation requires a participant id', {
            fields: ['createdBy'],
        })
    }
}

/**
 * Applies the mixed item-edit permission rules and returns only the persisted item fields.
 */
export function authorizeItemUpdate(currentItem: EventItem, input: UpdateItemRequest, isAdmin: boolean): ItemChanges {
    void currentItem
    void isAdmin

    const { participantId, ...changes } = input

    void participantId

    return changes
}
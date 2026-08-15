import type { CreateItemRequest, EventItem, UpdateItemRequest } from '@listcollab/shared'

import { AppError } from '../errors/AppError.js'

type ItemChanges = Omit<UpdateItemRequest, 'participantId'>

function hasAdminOnlyChanges(input: ItemChanges): boolean {
    return input.categoryId !== undefined || input.quantityRequired !== undefined || input.status !== undefined
}

function hasGuestEditableChanges(input: ItemChanges): boolean {
    return input.name !== undefined || input.description !== undefined
}

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
    const { participantId, ...changes } = input

    if (isAdmin) {
        return changes
    }

    if (hasAdminOnlyChanges(changes)) {
        throw new AppError(403, 'ADMIN_REQUIRED', 'Admin token required')
    }

    if (!hasGuestEditableChanges(changes)) {
        throw new AppError(400, 'VALIDATION_FAILED', 'Guest item updates must include a name or description', {
            fields: ['name', 'description'],
        })
    }

    if (!participantId) {
        throw new AppError(400, 'VALIDATION_FAILED', 'Participant id is required for guest item updates', {
            fields: ['participantId'],
        })
    }

    if (!currentItem.createdBy || currentItem.createdBy !== participantId) {
        throw new AppError(403, 'ITEM_EDIT_FORBIDDEN', 'Only the item creator can edit this item')
    }

    return changes
}
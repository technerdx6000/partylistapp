import type {
    CreateAssignmentRequest,
    DeleteAssignmentRequest,
    EventItemAssignment,
    UpdateAssignmentRequest,
} from '@listcollab/shared'

import { withTransaction } from '../db/pool.js'
import { AppError } from '../errors/AppError.js'
import { deleteAssignment, findAssignmentById, listAssignmentsByItemId, upsertAssignment } from '../repositories/assignmentRepository.js'
import { findItemByIdForUpdate } from '../repositories/itemRepository.js'
import { findParticipantById } from '../repositories/participantRepository.js'

function assertAssignmentOwner(
    assignment: EventItemAssignment,
    participantId: number | undefined,
    isAdmin: boolean
): void {
    if (isAdmin) {
        return
    }

    if (!participantId) {
        throw new AppError(400, 'VALIDATION_FAILED', 'Participant id is required', {
            fields: ['participantId'],
        })
    }

    if (assignment.participantId !== participantId) {
        throw new AppError(403, 'ASSIGNMENT_FORBIDDEN', 'Only the assignment owner can modify this claim')
    }
}

function assertWithinRequiredQuantity(requiredQuantity: number | null, claimedQuantity: number): void {
    if (requiredQuantity !== null && claimedQuantity > requiredQuantity) {
        throw new AppError(409, 'OVER_CLAIM', 'Claim exceeds the remaining quantity')
    }
}

/**
 * Creates or updates a participant claim for one item inside a transaction guarded by an item-row lock.
 */
export async function claimAssignment(
    eventId: number,
    itemId: number,
    input: CreateAssignmentRequest
): Promise<EventItemAssignment> {
    return withTransaction(async (connection) => {
        const item = await findItemByIdForUpdate(eventId, itemId, connection)

        if (!item) {
            throw new AppError(404, 'ITEM_NOT_IN_EVENT', 'Item not found')
        }

        const participant = await findParticipantById(eventId, input.participantId, connection)

        if (!participant) {
            throw new AppError(404, 'PARTICIPANT_NOT_IN_EVENT', 'Participant not found')
        }

        const assignments = await listAssignmentsByItemId(eventId, itemId, connection)
        const existingAssignment = assignments.find((assignment) => assignment.participantId === input.participantId)
        const claimedByOthers = assignments
            .filter((assignment) => assignment.id !== existingAssignment?.id)
            .reduce((total, assignment) => total + assignment.quantity, 0)

        assertWithinRequiredQuantity(item.quantityRequired, claimedByOthers + input.quantity)

        return upsertAssignment(itemId, input, connection)
    })
}

/**
 * Updates an existing assignment while preserving ownership checks and over-claim protection.
 */
export async function updateAssignmentClaim(
    eventId: number,
    assignmentId: number,
    input: UpdateAssignmentRequest,
    isAdmin: boolean
): Promise<EventItemAssignment> {
    return withTransaction(async (connection) => {
        const assignment = await findAssignmentById(eventId, assignmentId, connection)

        if (!assignment) {
            throw new AppError(404, 'ASSIGNMENT_NOT_IN_EVENT', 'Assignment not found')
        }

        assertAssignmentOwner(assignment, input.participantId, isAdmin)

        const item = await findItemByIdForUpdate(eventId, assignment.itemId, connection)

        if (!item) {
            throw new AppError(404, 'ITEM_NOT_IN_EVENT', 'Item not found')
        }

        const assignments = await listAssignmentsByItemId(eventId, assignment.itemId, connection)
        const claimedByOthers = assignments
            .filter((existingAssignment) => existingAssignment.id !== assignmentId)
            .reduce((total, existingAssignment) => total + existingAssignment.quantity, 0)

        assertWithinRequiredQuantity(item.quantityRequired, claimedByOthers + input.quantity)

        return upsertAssignment(assignment.itemId, input, connection)
    })
}

/**
 * Deletes an assignment after verifying event ownership and participant ownership for non-admin callers.
 */
export async function deleteAssignmentClaim(
    eventId: number,
    assignmentId: number,
    input: DeleteAssignmentRequest,
    isAdmin: boolean
): Promise<void> {
    const assignment = await findAssignmentById(eventId, assignmentId)

    if (!assignment) {
        throw new AppError(404, 'ASSIGNMENT_NOT_IN_EVENT', 'Assignment not found')
    }

    assertAssignmentOwner(assignment, input.participantId, isAdmin)

    const deleted = await deleteAssignment(eventId, assignmentId)

    if (!deleted) {
        throw new AppError(404, 'ASSIGNMENT_NOT_IN_EVENT', 'Assignment not found')
    }
}
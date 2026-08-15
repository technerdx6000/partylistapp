import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const serviceMocks = vi.hoisted(() => ({
    withTransaction: vi.fn(),
    deleteAssignment: vi.fn(),
    findAssignmentById: vi.fn(),
    listAssignmentsByItemId: vi.fn(),
    upsertAssignment: vi.fn(),
    findItemByIdForUpdate: vi.fn(),
    findParticipantById: vi.fn(),
}))

vi.mock('../db/pool.js', () => ({
    withTransaction: serviceMocks.withTransaction,
}))

vi.mock('../repositories/assignmentRepository.js', () => ({
    deleteAssignment: serviceMocks.deleteAssignment,
    findAssignmentById: serviceMocks.findAssignmentById,
    listAssignmentsByItemId: serviceMocks.listAssignmentsByItemId,
    upsertAssignment: serviceMocks.upsertAssignment,
}))

vi.mock('../repositories/itemRepository.js', () => ({
    findItemByIdForUpdate: serviceMocks.findItemByIdForUpdate,
}))

vi.mock('../repositories/participantRepository.js', () => ({
    findParticipantById: serviceMocks.findParticipantById,
}))

import {
    claimAssignment,
    deleteAssignmentClaim,
    updateAssignmentClaim,
} from './assignmentService.js'

function buildItem(overrides: Record<string, unknown> = {}) {
    return {
        id: 1,
        eventId: 1,
        categoryId: null,
        name: 'Milk',
        description: null,
        quantityRequired: 2,
        status: 'open',
        createdBy: null,
        createdAt: '2026-08-15T00:00:00.000Z',
        updatedAt: '2026-08-15T00:00:00.000Z',
        ...overrides,
    }
}

function buildAssignment(overrides: Record<string, unknown> = {}) {
    return {
        id: 11,
        itemId: 1,
        participantId: 4,
        quantity: 1,
        note: null,
        createdAt: '2026-08-15T00:00:00.000Z',
        ...overrides,
    }
}

describe('assignment service', () => {
    beforeEach(() => {
        serviceMocks.withTransaction.mockImplementation(async (callback: (connection: object) => Promise<unknown>) => callback({}))
        serviceMocks.deleteAssignment.mockResolvedValue(true)
        serviceMocks.findAssignmentById.mockResolvedValue(buildAssignment())
        serviceMocks.listAssignmentsByItemId.mockResolvedValue([])
        serviceMocks.upsertAssignment.mockResolvedValue(buildAssignment())
        serviceMocks.findItemByIdForUpdate.mockResolvedValue(buildItem())
        serviceMocks.findParticipantById.mockResolvedValue({ id: 4 })
    })

    afterEach(() => {
        vi.clearAllMocks()
    })

    it('rejects a claim when the item is outside the event', async () => {
        serviceMocks.findItemByIdForUpdate.mockResolvedValue(null)

        await expect(claimAssignment(1, 99, { participantId: 4, quantity: 1 })).rejects.toMatchObject({
            statusCode: 404,
            code: 'ITEM_NOT_IN_EVENT',
        })
    })

    it('rejects a claim when the participant is outside the event', async () => {
        serviceMocks.findParticipantById.mockResolvedValue(null)

        await expect(claimAssignment(1, 1, { participantId: 4, quantity: 1 })).rejects.toMatchObject({
            statusCode: 404,
            code: 'PARTICIPANT_NOT_IN_EVENT',
        })
    })

    it('rejects over-claims against required quantities', async () => {
        serviceMocks.listAssignmentsByItemId.mockResolvedValue([buildAssignment({ id: 12, participantId: 9, quantity: 2 })])

        await expect(claimAssignment(1, 1, { participantId: 4, quantity: 1 })).rejects.toMatchObject({
            statusCode: 409,
            code: 'OVER_CLAIM',
        })
    })

    it('allows unlimited claims on ad-hoc items', async () => {
        serviceMocks.findItemByIdForUpdate.mockResolvedValue(buildItem({ quantityRequired: null }))
        serviceMocks.listAssignmentsByItemId.mockResolvedValue([buildAssignment({ quantity: 5, participantId: 9 })])

        await expect(claimAssignment(1, 1, { participantId: 4, quantity: 6 })).resolves.toEqual(buildAssignment())
    })

    it('updates an existing claim without double-counting the previous quantity', async () => {
        serviceMocks.findItemByIdForUpdate.mockResolvedValue(buildItem({ quantityRequired: 3 }))
        serviceMocks.listAssignmentsByItemId.mockResolvedValue([
            buildAssignment({ id: 11, participantId: 4, quantity: 1 }),
            buildAssignment({ id: 12, participantId: 9, quantity: 1 }),
        ])

        await expect(claimAssignment(1, 1, { participantId: 4, quantity: 2 })).resolves.toEqual(buildAssignment())
        expect(serviceMocks.upsertAssignment).toHaveBeenCalledWith(1, { participantId: 4, quantity: 2 }, {})
    })

    it('rejects assignment updates for the wrong participant when the caller is not admin', async () => {
        await expect(updateAssignmentClaim(1, 11, { participantId: 8, quantity: 1 }, false)).rejects.toMatchObject({
            statusCode: 403,
            code: 'ASSIGNMENT_FORBIDDEN',
        })
    })

    it('rejects assignment updates when the assignment is outside the event', async () => {
        serviceMocks.findAssignmentById.mockResolvedValue(null)

        await expect(updateAssignmentClaim(1, 11, { participantId: 4, quantity: 1 }, false)).rejects.toMatchObject({
            statusCode: 404,
            code: 'ASSIGNMENT_NOT_IN_EVENT',
        })
    })

    it('rejects assignment updates when the item disappears after the assignment is loaded', async () => {
        serviceMocks.findItemByIdForUpdate.mockResolvedValue(null)

        await expect(updateAssignmentClaim(1, 11, { participantId: 4, quantity: 1 }, false)).rejects.toMatchObject({
            statusCode: 404,
            code: 'ITEM_NOT_IN_EVENT',
        })
    })

    it('rejects assignment updates that would over-claim after excluding the current row', async () => {
        serviceMocks.listAssignmentsByItemId.mockResolvedValue([
            buildAssignment({ id: 11, participantId: 4, quantity: 1 }),
            buildAssignment({ id: 12, participantId: 9, quantity: 2 }),
        ])

        await expect(updateAssignmentClaim(1, 11, { participantId: 4, quantity: 2 }, false)).rejects.toMatchObject({
            statusCode: 409,
            code: 'OVER_CLAIM',
        })
    })

    it('allows admins to update another participant assignment', async () => {
        await expect(updateAssignmentClaim(1, 11, { participantId: 4, quantity: 2 }, true)).resolves.toEqual(buildAssignment())
    })

    it('requires participant identity for non-admin assignment deletes', async () => {
        await expect(deleteAssignmentClaim(1, 11, {}, false)).rejects.toMatchObject({
            statusCode: 400,
            code: 'VALIDATION_FAILED',
        })
    })

    it('rejects assignment deletes for the wrong participant when the caller is not admin', async () => {
        await expect(deleteAssignmentClaim(1, 11, { participantId: 8 }, false)).rejects.toMatchObject({
            statusCode: 403,
            code: 'ASSIGNMENT_FORBIDDEN',
        })
    })

    it('allows admins to delete another participant assignment', async () => {
        await expect(deleteAssignmentClaim(1, 11, {}, true)).resolves.toBeUndefined()
        expect(serviceMocks.deleteAssignment).toHaveBeenCalledWith(1, 11)
    })

    it('rejects assignment deletes when the row is already gone by delete time', async () => {
        serviceMocks.deleteAssignment.mockResolvedValue(false)

        await expect(deleteAssignmentClaim(1, 11, { participantId: 4 }, false)).rejects.toMatchObject({
            statusCode: 404,
            code: 'ASSIGNMENT_NOT_IN_EVENT',
        })
    })
})
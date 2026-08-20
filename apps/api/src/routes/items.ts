import {
    CreateAssignmentRequestSchema,
    CreateItemRequestSchema,
    EventItemAssignmentSchema,
    EventItemWithAssignmentsSchema,
    PositiveIntIdSchema,
    UpdateItemRequestSchema,
    calculateCoverage,
    type CreateAssignmentRequest,
    type CreateItemRequest,
    type EventItem,
    type EventItemWithAssignments,
    type UpdateItemRequest,
} from '@listcollab/shared'
import express from 'express'

import { AppError } from '../errors/AppError.js'
import { requireEventToken } from '../middleware/eventToken.js'
import { listAssignmentsByEventId, listAssignmentsByItemId } from '../repositories/assignmentRepository.js'
import { findCategoryById } from '../repositories/categoryRepository.js'
import { createItem, deleteItem, findItemById, listItemsByEventId, updateItem } from '../repositories/itemRepository.js'
import { findParticipantById } from '../repositories/participantRepository.js'
import { claimAssignment } from '../services/assignmentService.js'
import { assertCanCreateItem, authorizeItemUpdate } from '../services/itemService.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = express.Router()

function normalizeItemName(name: string): string {
    return name.trim().toLocaleLowerCase()
}

function parseItemId(value: string): number {
    const parsed = PositiveIntIdSchema.safeParse(value)

    if (!parsed.success) {
        throw new AppError(400, 'VALIDATION_FAILED', 'Invalid item id', {
            fields: ['id'],
        })
    }

    return parsed.data
}

async function assertCategoryInEvent(eventId: number, categoryId: number | null | undefined): Promise<void> {
    if (categoryId === undefined || categoryId === null) {
        return
    }

    const category = await findCategoryById(eventId, categoryId)

    if (!category) {
        throw new AppError(404, 'CATEGORY_NOT_IN_EVENT', 'Category not found')
    }
}

async function assertParticipantInEvent(eventId: number, participantId: number | null | undefined): Promise<void> {
    if (participantId === undefined || participantId === null) {
        return
    }

    const participant = await findParticipantById(eventId, participantId)

    if (!participant) {
        throw new AppError(404, 'PARTICIPANT_NOT_IN_EVENT', 'Participant not found')
    }
}

async function assertUniqueItemNameInEvent(eventId: number, name: string, itemIdToIgnore?: number): Promise<void> {
    const existingItems = await listItemsByEventId(eventId)
    const normalizedName = normalizeItemName(name)
    const duplicateItem = existingItems.find((item) => {
        if (itemIdToIgnore !== undefined && item.id === itemIdToIgnore) {
            return false
        }

        return normalizeItemName(item.name) === normalizedName
    })

    if (duplicateItem) {
        throw new AppError(409, 'ITEM_ALREADY_EXISTS', 'Item name already exists in this event', {
            fields: ['name'],
        })
    }
}

function buildItemCoverage(item: EventItem, quantities: number[]): EventItemWithAssignments['coverage'] {
    return calculateCoverage(item.quantityRequired, quantities)
}

async function buildEventItemResponse(eventId: number, item: EventItem): Promise<EventItemWithAssignments> {
    const assignments = await listAssignmentsByItemId(eventId, item.id)

    return EventItemWithAssignmentsSchema.parse({
        ...item,
        assignments,
        coverage: buildItemCoverage(
            item,
            assignments.map((assignment) => assignment.quantity)
        ),
    })
}

async function buildEventItemList(eventId: number): Promise<EventItemWithAssignments[]> {
    const [items, assignments] = await Promise.all([
        listItemsByEventId(eventId),
        listAssignmentsByEventId(eventId),
    ])
    const assignmentsByItemId = new Map<number, typeof assignments>()

    for (const assignment of assignments) {
        const itemAssignments = assignmentsByItemId.get(assignment.itemId) ?? []
        itemAssignments.push(assignment)
        assignmentsByItemId.set(assignment.itemId, itemAssignments)
    }

    return EventItemWithAssignmentsSchema.array().parse(
        items.map((item) => {
            const itemAssignments = assignmentsByItemId.get(item.id) ?? []

            return {
                ...item,
                assignments: itemAssignments,
                coverage: buildItemCoverage(
                    item,
                    itemAssignments.map((assignment) => assignment.quantity)
                ),
            }
        })
    )
}

router.use(requireEventToken)

router.get(
    '/',
    asyncHandler(async (req, res) => {
        const items = await buildEventItemList(req.event!.id)
        res.json(items)
    })
)

router.post(
    '/',
    asyncHandler(async (req, res) => {
        const parsedBody = CreateItemRequestSchema.safeParse(req.body as CreateItemRequest)

        if (!parsedBody.success) {
            throw new AppError(400, 'VALIDATION_FAILED', 'Invalid item payload', {
                fields: parsedBody.error.issues.map((issue) => issue.path.join('.')),
            })
        }

        assertCanCreateItem(parsedBody.data, req.event!.isAdmin)
    await assertUniqueItemNameInEvent(req.event!.id, parsedBody.data.name)
        await assertCategoryInEvent(req.event!.id, parsedBody.data.categoryId)
        await assertParticipantInEvent(req.event!.id, parsedBody.data.createdBy)

        const item = await createItem(req.event!.id, parsedBody.data)
        res.status(201).json(await buildEventItemResponse(req.event!.id, item))
    })
)

router.patch(
    '/:id',
    asyncHandler(async (req, res) => {
        const itemId = parseItemId(String(req.params.id))
        const parsedBody = UpdateItemRequestSchema.safeParse(req.body as UpdateItemRequest)

        if (!parsedBody.success) {
            throw new AppError(400, 'VALIDATION_FAILED', 'Invalid item payload', {
                fields: parsedBody.error.issues.map((issue) => issue.path.join('.')),
            })
        }

        const currentItem = await findItemById(req.event!.id, itemId)

        if (!currentItem) {
            throw new AppError(404, 'ITEM_NOT_IN_EVENT', 'Item not found')
        }

        await assertParticipantInEvent(req.event!.id, parsedBody.data.participantId)
        const authorizedUpdate = authorizeItemUpdate(currentItem, parsedBody.data, req.event!.isAdmin)
    await assertUniqueItemNameInEvent(req.event!.id, authorizedUpdate.name ?? currentItem.name, currentItem.id)
        await assertCategoryInEvent(req.event!.id, authorizedUpdate.categoryId)

        const item = await updateItem(req.event!.id, itemId, authorizedUpdate)

        if (!item) {
            throw new AppError(404, 'ITEM_NOT_IN_EVENT', 'Item not found')
        }

        res.json(await buildEventItemResponse(req.event!.id, item))
    })
)

router.post(
    '/:id/assignments',
    asyncHandler(async (req, res) => {
        const itemId = parseItemId(String(req.params.id))
        const parsedBody = CreateAssignmentRequestSchema.safeParse(req.body as CreateAssignmentRequest)

        if (!parsedBody.success) {
            throw new AppError(400, 'VALIDATION_FAILED', 'Invalid assignment payload', {
                fields: parsedBody.error.issues.map((issue) => issue.path.join('.')),
            })
        }

        const assignment = await claimAssignment(req.event!.id, itemId, parsedBody.data)
        res.status(201).json(EventItemAssignmentSchema.parse(assignment))
    })
)

router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
        const itemId = parseItemId(String(req.params.id))
        const deleted = await deleteItem(req.event!.id, itemId)

        if (!deleted) {
            throw new AppError(404, 'ITEM_NOT_IN_EVENT', 'Item not found')
        }

        res.status(204).send()
    })
)

export default router
import {
    AggregateEventResponseSchema,
    CreateEventRequestSchema,
    CreateEventResponseSchema,
    calculateCoverage,
    type AggregateEventResponse,
    type CreateEventRequest,
} from '@listcollab/shared'
import express from 'express'

import { withTransaction } from '../db/pool.js'
import { AppError } from '../errors/AppError.js'
import { requireAdminToken, requireEventToken } from '../middleware/eventToken.js'
import { listAssignmentsByEventId } from '../repositories/assignmentRepository.js'
import { createCategory, listCategoriesByEventId } from '../repositories/categoryRepository.js'
import { createEvent, findEventById, toPublicEvent } from '../repositories/eventRepository.js'
import { listItemsByEventId } from '../repositories/itemRepository.js'
import { listParticipantsByEventId } from '../repositories/participantRepository.js'
import { generateAdminToken, generateShareToken } from '../services/tokenService.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = express.Router()

async function buildAggregateResponse(eventId: number): Promise<AggregateEventResponse> {
    const event = await findEventById(eventId)

    if (!event) {
        throw new AppError(404, 'EVENT_NOT_FOUND', 'Event not found')
    }

    const [participants, categories, items, assignments] = await Promise.all([
        listParticipantsByEventId(eventId),
        listCategoriesByEventId(eventId),
        listItemsByEventId(eventId),
        listAssignmentsByEventId(eventId),
    ])

    const assignmentsByItemId = new Map<number, typeof assignments>()

    for (const assignment of assignments) {
        const itemAssignments = assignmentsByItemId.get(assignment.itemId) ?? []
        itemAssignments.push(assignment)
        assignmentsByItemId.set(assignment.itemId, itemAssignments)
    }

    const aggregate = {
        event: toPublicEvent(event),
        participants,
        categories,
        items: items.map((item) => {
            const itemAssignments = assignmentsByItemId.get(item.id) ?? []

            return {
                ...item,
                assignments: itemAssignments,
                coverage: calculateCoverage(
                    item.quantityRequired,
                    itemAssignments.map((assignment) => assignment.quantity)
                ),
            }
        }),
    }

    return AggregateEventResponseSchema.parse(aggregate)
}

router.post(
    '/',
    asyncHandler(async (req, res) => {
        const parsedBody = CreateEventRequestSchema.safeParse(req.body as CreateEventRequest)

        if (!parsedBody.success) {
            throw new AppError(400, 'VALIDATION_FAILED', 'Invalid event payload', {
                fields: parsedBody.error.issues.map((issue) => issue.path.join('.')),
            })
        }

        const shareToken = generateShareToken()
        const adminToken = generateAdminToken()

        const event = await withTransaction(async (connection) => {
            const createdEvent = await createEvent(parsedBody.data, shareToken, adminToken, connection)

            for (const category of parsedBody.data.categories ?? []) {
                await createCategory(
                    createdEvent.id,
                    {
                        name: category.name,
                        icon: category.icon ?? null,
                        sortOrder: category.sortOrder ?? 0,
                    },
                    connection
                )
            }

            return createdEvent
        })

        const aggregate = await buildAggregateResponse(event.id)

        res.status(201).json(
            CreateEventResponseSchema.parse({
                ...aggregate,
                event,
            })
        )
    })
)

router.get(
    '/:shareToken',
    requireEventToken,
    asyncHandler(async (req, res) => {
        const shareToken = String(req.params.shareToken ?? '')

        if (!req.event || req.event.shareToken !== shareToken) {
            throw new AppError(404, 'EVENT_NOT_FOUND', 'Event not found')
        }

        const aggregate = await buildAggregateResponse(req.event.id)
        res.json(aggregate)
    })
)

router.patch('/:shareToken', requireEventToken, requireAdminToken, () => {
    throw new AppError(501, 'NOT_IMPLEMENTED', 'Event update route not implemented yet')
})

router.delete('/:shareToken', requireEventToken, requireAdminToken, () => {
    throw new AppError(501, 'NOT_IMPLEMENTED', 'Event delete route not implemented yet')
})

export default router
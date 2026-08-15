import {
    AggregateEventResponseSchema,
    CreateEventRequestSchema,
    CreateEventResponseSchema,
    UpdateEventRequestSchema,
    calculateCoverage,
    type AggregateEventResponse,
    type CreateEventRequest,
    type UpdateEventRequest,
} from '@listcollab/shared'
import express from 'express'

import { withTransaction } from '../db/pool.js'
import { AppError } from '../errors/AppError.js'
import { requireAdminToken, requireEventToken } from '../middleware/eventToken.js'
import { eventCreateRateLimit, tokenResolutionRateLimit } from '../middleware/rateLimits.js'
import { listAssignmentsByEventId } from '../repositories/assignmentRepository.js'
import { createCategory, listCategoriesByEventId } from '../repositories/categoryRepository.js'
import { createEvent, deleteEvent, findEventById, toPublicEvent, updateEvent } from '../repositories/eventRepository.js'
import { listItemsByEventId } from '../repositories/itemRepository.js'
import { listParticipantsByEventId } from '../repositories/participantRepository.js'
import { generateAdminToken, generateShareToken } from '../services/tokenService.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = express.Router()

function assertEventRouteScope(routeShareToken: string, requestShareToken: string): void {
    if (routeShareToken !== requestShareToken) {
        throw new AppError(404, 'EVENT_NOT_FOUND', 'Event not found')
    }
}

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
    eventCreateRateLimit,
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
    tokenResolutionRateLimit,
    requireEventToken,
    asyncHandler(async (req, res) => {
        const shareToken = String(req.params.shareToken)
        const eventContext = req.event!

        assertEventRouteScope(shareToken, eventContext.shareToken)

        const aggregate = await buildAggregateResponse(eventContext.id)
        res.json(aggregate)
    })
)

router.patch(
    '/:shareToken',
    requireEventToken,
    requireAdminToken,
    asyncHandler(async (req, res) => {
        const shareToken = String(req.params.shareToken)
        const eventContext = req.event!
        const parsedBody = UpdateEventRequestSchema.safeParse(req.body as UpdateEventRequest)

        assertEventRouteScope(shareToken, eventContext.shareToken)

        if (!parsedBody.success) {
            throw new AppError(400, 'VALIDATION_FAILED', 'Invalid event payload', {
                fields: parsedBody.error.issues.map((issue) => issue.path.join('.')),
            })
        }

        const updatedEvent = await updateEvent(eventContext.id, parsedBody.data)

        if (!updatedEvent) {
            throw new AppError(404, 'EVENT_NOT_FOUND', 'Event not found')
        }

        const aggregate = await buildAggregateResponse(updatedEvent.id)
        res.json(aggregate)
    })
)

router.delete(
    '/:shareToken',
    requireEventToken,
    requireAdminToken,
    asyncHandler(async (req, res) => {
        const shareToken = String(req.params.shareToken)
        const eventContext = req.event!

        assertEventRouteScope(shareToken, eventContext.shareToken)

        const deleted = await deleteEvent(eventContext.id)

        if (!deleted) {
            throw new AppError(404, 'EVENT_NOT_FOUND', 'Event not found')
        }

        res.status(204).send()
    })
)

export default router
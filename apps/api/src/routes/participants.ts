import {
    CreateParticipantRequestSchema,
    EventParticipantSchema,
    PositiveIntIdSchema,
    UpdateParticipantRequestSchema,
    type CreateParticipantRequest,
    type UpdateParticipantRequest,
} from '@listcollab/shared'
import express from 'express'

import { AppError } from '../errors/AppError.js'
import { requireAdminToken, requireEventToken } from '../middleware/eventToken.js'
import {
    createParticipant,
    deleteParticipant,
    findParticipantByName,
    listParticipantsByEventId,
    updateParticipant,
} from '../repositories/participantRepository.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const MAX_PARTICIPANTS_PER_EVENT = 200
const router = express.Router()

function parseParticipantId(value: string): number {
    const parsed = PositiveIntIdSchema.safeParse(value)

    if (!parsed.success) {
        throw new AppError(400, 'VALIDATION_FAILED', 'Invalid participant id', {
            fields: ['id'],
        })
    }

    return parsed.data
}

router.use(requireEventToken)

router.get(
    '/',
    asyncHandler(async (req, res) => {
        const participants = await listParticipantsByEventId(req.event!.id)
        res.json(EventParticipantSchema.array().parse(participants))
    })
)

router.post(
    '/',
    asyncHandler(async (req, res) => {
        const parsedBody = CreateParticipantRequestSchema.safeParse(req.body as CreateParticipantRequest)

        if (!parsedBody.success) {
            throw new AppError(400, 'VALIDATION_FAILED', 'Invalid participant payload', {
                fields: parsedBody.error.issues.map((issue) => issue.path.join('.')),
            })
        }

        const existingParticipant = await findParticipantByName(req.event!.id, parsedBody.data.name)

        if (existingParticipant) {
            res.json(EventParticipantSchema.parse(existingParticipant))
            return
        }

        const participants = await listParticipantsByEventId(req.event!.id)

        if (participants.length >= MAX_PARTICIPANTS_PER_EVENT) {
            throw new AppError(409, 'PARTICIPANT_LIMIT_REACHED', 'Participant limit reached')
        }

        const participant = await createParticipant(req.event!.id, parsedBody.data)
        res.status(201).json(EventParticipantSchema.parse(participant))
    })
)

router.patch(
    '/:id',
    requireAdminToken,
    asyncHandler(async (req, res) => {
        const participantId = parseParticipantId(String(req.params.id))
        const parsedBody = UpdateParticipantRequestSchema.safeParse(req.body as UpdateParticipantRequest)

        if (!parsedBody.success) {
            throw new AppError(400, 'VALIDATION_FAILED', 'Invalid participant payload', {
                fields: parsedBody.error.issues.map((issue) => issue.path.join('.')),
            })
        }

        const participant = await updateParticipant(req.event!.id, participantId, parsedBody.data)

        if (!participant) {
            throw new AppError(404, 'PARTICIPANT_NOT_IN_EVENT', 'Participant not found')
        }

        res.json(EventParticipantSchema.parse(participant))
    })
)

router.delete(
    '/:id',
    requireAdminToken,
    asyncHandler(async (req, res) => {
        const participantId = parseParticipantId(String(req.params.id))
        const deleted = await deleteParticipant(req.event!.id, participantId)

        if (!deleted) {
            throw new AppError(404, 'PARTICIPANT_NOT_IN_EVENT', 'Participant not found')
        }

        res.status(204).send()
    })
)

export default router
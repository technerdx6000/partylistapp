import {
    DeleteAssignmentRequestSchema,
    EventItemAssignmentSchema,
    PositiveIntIdSchema,
    UpdateAssignmentRequestSchema,
    type DeleteAssignmentRequest,
    type UpdateAssignmentRequest,
} from '@listcollab/shared'
import express from 'express'

import { AppError } from '../errors/AppError.js'
import { requireEventToken } from '../middleware/eventToken.js'
import { deleteAssignmentClaim, updateAssignmentClaim } from '../services/assignmentService.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = express.Router()

function parseAssignmentId(value: string): number {
    const parsed = PositiveIntIdSchema.safeParse(value)

    if (!parsed.success) {
        throw new AppError(400, 'VALIDATION_FAILED', 'Invalid assignment id', {
            fields: ['id'],
        })
    }

    return parsed.data
}

router.use(requireEventToken)

router.patch(
    '/:id',
    asyncHandler(async (req, res) => {
        const assignmentId = parseAssignmentId(String(req.params.id))
        const parsedBody = UpdateAssignmentRequestSchema.safeParse(req.body as UpdateAssignmentRequest)

        if (!parsedBody.success) {
            throw new AppError(400, 'VALIDATION_FAILED', 'Invalid assignment payload', {
                fields: parsedBody.error.issues.map((issue) => issue.path.join('.')),
            })
        }

        const assignment = await updateAssignmentClaim(req.event!.id, assignmentId, parsedBody.data, req.event!.isAdmin)
        res.json(EventItemAssignmentSchema.parse(assignment))
    })
)

router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
        const assignmentId = parseAssignmentId(String(req.params.id))
        const parsedBody = DeleteAssignmentRequestSchema.safeParse(req.body as DeleteAssignmentRequest)

        if (!parsedBody.success) {
            throw new AppError(400, 'VALIDATION_FAILED', 'Invalid assignment payload', {
                fields: parsedBody.error.issues.map((issue) => issue.path.join('.')),
            })
        }

        await deleteAssignmentClaim(req.event!.id, assignmentId, parsedBody.data, req.event!.isAdmin)
        res.status(204).send()
    })
)

export default router
import {
    CreateCategoryRequestSchema,
    EventCategorySchema,
    PositiveIntIdSchema,
    UpdateCategoryRequestSchema,
    type CreateCategoryRequest,
    type UpdateCategoryRequest,
} from '@listcollab/shared'
import express from 'express'

import { AppError } from '../errors/AppError.js'
import { requireAdminToken, requireEventToken } from '../middleware/eventToken.js'
import {
    createCategory,
    deleteCategory,
    listCategoriesByEventId,
    updateCategory,
} from '../repositories/categoryRepository.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = express.Router()

function isDuplicateEntryError(caughtError: unknown): caughtError is { code: string } {
    return Boolean(
        caughtError &&
        typeof caughtError === 'object' &&
        'code' in caughtError &&
        caughtError.code === 'ER_DUP_ENTRY'
    )
}

function parseCategoryId(value: string): number {
    const parsed = PositiveIntIdSchema.safeParse(value)

    if (!parsed.success) {
        throw new AppError(400, 'VALIDATION_FAILED', 'Invalid category id', {
            fields: ['id'],
        })
    }

    return parsed.data
}

router.use(requireEventToken)

router.get(
    '/',
    asyncHandler(async (req, res) => {
        const categories = await listCategoriesByEventId(req.event!.id)
        res.json(EventCategorySchema.array().parse(categories))
    })
)

router.post(
    '/',
    requireAdminToken,
    asyncHandler(async (req, res) => {
        const parsedBody = CreateCategoryRequestSchema.safeParse(req.body as CreateCategoryRequest)

        if (!parsedBody.success) {
            throw new AppError(400, 'VALIDATION_FAILED', 'Invalid category payload', {
                fields: parsedBody.error.issues.map((issue) => issue.path.join('.')),
            })
        }

        let category

        try {
            category = await createCategory(req.event!.id, parsedBody.data)
        } catch (caughtError) {
            if (isDuplicateEntryError(caughtError)) {
                throw new AppError(409, 'CATEGORY_ALREADY_EXISTS', 'Category name already exists in this event', {
                    fields: ['name'],
                })
            }

            throw caughtError
        }

        res.status(201).json(EventCategorySchema.parse(category))
    })
)

router.patch(
    '/:id',
    requireAdminToken,
    asyncHandler(async (req, res) => {
        const categoryId = parseCategoryId(String(req.params.id))
        const parsedBody = UpdateCategoryRequestSchema.safeParse(req.body as UpdateCategoryRequest)

        if (!parsedBody.success) {
            throw new AppError(400, 'VALIDATION_FAILED', 'Invalid category payload', {
                fields: parsedBody.error.issues.map((issue) => issue.path.join('.')),
            })
        }

        let category

        try {
            category = await updateCategory(req.event!.id, categoryId, parsedBody.data)
        } catch (caughtError) {
            if (isDuplicateEntryError(caughtError)) {
                throw new AppError(409, 'CATEGORY_ALREADY_EXISTS', 'Category name already exists in this event', {
                    fields: ['name'],
                })
            }

            throw caughtError
        }

        if (!category) {
            throw new AppError(404, 'CATEGORY_NOT_IN_EVENT', 'Category not found')
        }

        res.json(EventCategorySchema.parse(category))
    })
)

router.delete(
    '/:id',
    requireAdminToken,
    asyncHandler(async (req, res) => {
        const categoryId = parseCategoryId(String(req.params.id))
        const deleted = await deleteCategory(req.event!.id, categoryId)

        if (!deleted) {
            throw new AppError(404, 'CATEGORY_NOT_IN_EVENT', 'Category not found')
        }

        res.status(204).send()
    })
)

export default router
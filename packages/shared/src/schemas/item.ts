import { z } from 'zod';

import { EventItemAssignmentSchema } from './assignment';

export const EventItemStatusSchema = z.enum(['open', 'covered', 'completed']);

export const EventItemCoverageSchema = z.object({
    required: z.number().int().min(1).max(999).nullable(),
    claimed: z.number().int().min(0),
    remaining: z.number().int().min(0).nullable(),
    status: EventItemStatusSchema,
});

export const EventItemSchema = z.object({
    id: z.number().int().positive(),
    eventId: z.number().int().positive(),
    categoryId: z.number().int().positive().nullable(),
    name: z.string().min(1).max(120),
    description: z.string().max(500).nullable(),
    quantityRequired: z.number().int().min(1).max(999).nullable(),
    status: EventItemStatusSchema,
    createdBy: z.number().int().positive().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
});

export const EventItemWithAssignmentsSchema = EventItemSchema.extend({
    assignments: z.array(EventItemAssignmentSchema),
    coverage: EventItemCoverageSchema,
});

export const CreateItemRequestSchema = z.object({
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(500).nullable().optional(),
    categoryId: z.number().int().positive().nullable().optional(),
    quantityRequired: z.number().int().min(1).max(999).nullable().optional(),
    createdBy: z.number().int().positive().nullable().optional(),
}).strict();

export const UpdateItemRequestSchema = z.object({
    participantId: z.number().int().positive().optional(),
    name: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(500).nullable().optional(),
    categoryId: z.number().int().positive().nullable().optional(),
    quantityRequired: z.number().int().min(1).max(999).nullable().optional(),
    status: EventItemStatusSchema.optional(),
}).strict();
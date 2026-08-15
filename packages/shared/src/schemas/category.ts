import { z } from 'zod';

export const EventCategorySchema = z.object({
    id: z.number().int().positive(),
    eventId: z.number().int().positive(),
    name: z.string().min(1).max(60),
    icon: z.string().max(40).nullable(),
    sortOrder: z.number().int().min(0),
    createdAt: z.string(),
});

export const CreateCategoryRequestSchema = z.object({
    name: z.string().trim().min(1).max(60),
    icon: z.string().trim().min(1).max(40).nullable().optional(),
    sortOrder: z.number().int().min(0).optional(),
}).strict();

export const UpdateCategoryRequestSchema = z.object({
    name: z.string().trim().min(1).max(60).optional(),
    icon: z.string().trim().min(1).max(40).nullable().optional(),
    sortOrder: z.number().int().min(0).optional(),
}).strict();
import { z } from 'zod';

export const EventItemAssignmentSchema = z.object({
    id: z.number().int().positive(),
    itemId: z.number().int().positive(),
    participantId: z.number().int().positive(),
    quantity: z.number().int().min(1).max(999),
    note: z.string().max(500).nullable(),
    createdAt: z.string(),
});

export const CreateAssignmentRequestSchema = z.object({
    participantId: z.number().int().positive(),
    quantity: z.number().int().min(1).max(999),
    note: z.string().trim().max(500).nullable().optional(),
}).strict();

export const UpdateAssignmentRequestSchema = z.object({
    participantId: z.number().int().positive(),
    quantity: z.number().int().min(1).max(999),
    note: z.string().trim().max(500).nullable().optional(),
}).strict();

export const DeleteAssignmentRequestSchema = z.object({
    participantId: z.number().int().positive().optional(),
}).strict();
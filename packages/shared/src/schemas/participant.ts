import { z } from 'zod';

export const EventParticipantSchema = z.object({
    id: z.number().int().positive(),
    eventId: z.number().int().positive(),
    name: z.string().min(1).max(60),
    createdAt: z.string(),
});

export const CreateParticipantRequestSchema = z.object({
    name: z.string().trim().min(1).max(60),
}).strict();

export const UpdateParticipantRequestSchema = z.object({
    name: z.string().trim().min(1).max(60),
}).strict();
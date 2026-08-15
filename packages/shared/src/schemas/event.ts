import { z } from 'zod';

const EventDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const EventCategorySeedSchema = z.object({
  name: z.string().trim().min(1).max(60),
  icon: z.string().trim().min(1).max(40).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
}).strict();

export const EventSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(120),
  description: z.string().max(2000).nullable(),
  eventDate: EventDateSchema.nullable(),
  location: z.string().max(200).nullable(),
  shareToken: z.string().min(10).max(24),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const EventWithAdminTokenSchema = EventSchema.extend({
  adminToken: z.string().length(64),
});

export const CreateEventRequestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).nullable().optional(),
  eventDate: EventDateSchema.nullable().optional(),
  location: z.string().trim().max(200).nullable().optional(),
  categories: z.array(EventCategorySeedSchema).max(20).optional(),
}).strict();

export const UpdateEventRequestSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  eventDate: EventDateSchema.nullable().optional(),
  location: z.string().trim().max(200).nullable().optional(),
}).strict();
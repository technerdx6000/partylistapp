import { z } from 'zod';

import { EventCategorySchema } from './category';
import { EventSchema, EventWithAdminTokenSchema } from './event';
import { EventItemWithAssignmentsSchema } from './item';
import { EventParticipantSchema } from './participant';

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
    requestId: z.string().min(1),
  }),
});

export const AggregateEventResponseSchema = z.object({
  event: EventSchema,
  participants: z.array(EventParticipantSchema),
  categories: z.array(EventCategorySchema),
  items: z.array(EventItemWithAssignmentsSchema),
});

export const CreateEventResponseSchema = z.object({
  event: EventWithAdminTokenSchema,
  participants: z.array(EventParticipantSchema),
  categories: z.array(EventCategorySchema),
  items: z.array(EventItemWithAssignmentsSchema),
});
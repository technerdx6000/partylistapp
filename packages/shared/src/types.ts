import type { z } from "zod";

import {
    ApiErrorSchema,
    AggregateEventResponseSchema,
    CreateEventResponseSchema,
} from "./schemas/api";
import {
    CreateAssignmentRequestSchema as NewCreateAssignmentRequestSchema,
    EventItemAssignmentSchema as NewEventItemAssignmentSchema,
    UpdateAssignmentRequestSchema as NewUpdateAssignmentRequestSchema,
} from "./schemas/assignment";
import {
    CreateCategoryRequestSchema as NewCreateCategoryRequestSchema,
    EventCategorySchema as NewEventCategorySchema,
    UpdateCategoryRequestSchema as NewUpdateCategoryRequestSchema,
} from "./schemas/category";
import {
    CategoryInputSchema,
    CategorySchema,
    ItemCreateInputSchema,
    ItemSchema,
    ItemUpdateInputSchema,
    PersonInputSchema,
    PersonSchema,
    RequiredItemAssignInputSchema,
    RequiredItemInputSchema,
    RequiredItemSchema,
} from "./schemas/entities";
import {
    CreateEventRequestSchema as NewCreateEventRequestSchema,
    EventSchema as NewEventSchema,
    EventWithAdminTokenSchema as NewEventWithAdminTokenSchema,
    UpdateEventRequestSchema as NewUpdateEventRequestSchema,
} from "./schemas/event";
import {
    CreateItemRequestSchema as NewCreateItemRequestSchema,
    EventItemCoverageSchema as NewEventItemCoverageSchema,
    EventItemSchema as NewEventItemSchema,
    EventItemStatusSchema as NewEventItemStatusSchema,
    EventItemWithAssignmentsSchema as NewEventItemWithAssignmentsSchema,
    UpdateItemRequestSchema as NewUpdateItemRequestSchema,
} from "./schemas/item";
import {
    CreateParticipantRequestSchema as NewCreateParticipantRequestSchema,
    EventParticipantSchema as NewEventParticipantSchema,
    UpdateParticipantRequestSchema as NewUpdateParticipantRequestSchema,
} from "./schemas/participant";

export type Person = z.infer<typeof PersonSchema>;
export type PersonInput = z.infer<typeof PersonInputSchema>;
export type Category = z.infer<typeof CategorySchema>;
export type CategoryInput = z.infer<typeof CategoryInputSchema>;
export type Item = z.infer<typeof ItemSchema>;
export type ItemCreateInput = z.infer<typeof ItemCreateInputSchema>;
export type ItemUpdateInput = z.infer<typeof ItemUpdateInputSchema>;
export type RequiredItem = z.infer<typeof RequiredItemSchema>;
export type RequiredItemInput = z.infer<typeof RequiredItemInputSchema>;
export type RequiredItemAssignInput = z.infer<typeof RequiredItemAssignInputSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
export type Event = z.infer<typeof NewEventSchema>;
export type EventWithAdminToken = z.infer<typeof NewEventWithAdminTokenSchema>;
export type CreateEventRequest = z.infer<typeof NewCreateEventRequestSchema>;
export type UpdateEventRequest = z.infer<typeof NewUpdateEventRequestSchema>;
export type AggregateEventResponse = z.infer<typeof AggregateEventResponseSchema>;
export type CreateEventResponse = z.infer<typeof CreateEventResponseSchema>;
export type EventParticipant = z.infer<typeof NewEventParticipantSchema>;
export type CreateParticipantRequest = z.infer<typeof NewCreateParticipantRequestSchema>;
export type UpdateParticipantRequest = z.infer<typeof NewUpdateParticipantRequestSchema>;
export type EventCategory = z.infer<typeof NewEventCategorySchema>;
export type CreateCategoryRequest = z.infer<typeof NewCreateCategoryRequestSchema>;
export type UpdateCategoryRequest = z.infer<typeof NewUpdateCategoryRequestSchema>;
export type EventItemStatus = z.infer<typeof NewEventItemStatusSchema>;
export type EventItemCoverage = z.infer<typeof NewEventItemCoverageSchema>;
export type EventItem = z.infer<typeof NewEventItemSchema>;
export type EventItemWithAssignments = z.infer<typeof NewEventItemWithAssignmentsSchema>;
export type CreateItemRequest = z.infer<typeof NewCreateItemRequestSchema>;
export type UpdateItemRequest = z.infer<typeof NewUpdateItemRequestSchema>;
export type EventItemAssignment = z.infer<typeof NewEventItemAssignmentSchema>;
export type CreateAssignmentRequest = z.infer<typeof NewCreateAssignmentRequestSchema>;
export type UpdateAssignmentRequest = z.infer<typeof NewUpdateAssignmentRequestSchema>;
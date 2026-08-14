import type { z } from "zod";

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
import { z } from "zod";

export const PersonSchema = z.object({
  id: z.number().int().nonnegative(),
  name: z.string().min(1),
  created_at: z.string(),
  updated_at: z.string(),
});

export const CategorySchema = z.object({
  id: z.number().int().nonnegative(),
  name: z.string().min(1),
  icon: z.string().min(1),
  created_at: z.string(),
  updated_at: z.string(),
});

export const ItemSchema = z.object({
  id: z.number().int().nonnegative(),
  name: z.string().min(1),
  category_id: z.number().int().nonnegative(),
  person_id: z.number().int().nonnegative(),
  created_at: z.string(),
  updated_at: z.string(),
  category_name: z.string().min(1),
  category_icon: z.string().min(1),
  person_name: z.string().min(1),
});

export const RequiredItemSchema = z.object({
  id: z.number().int().nonnegative(),
  name: z.string().min(1),
  category_id: z.number().int().nonnegative(),
  person_id: z.number().int().nonnegative().nullable(),
  is_fulfilled: z.union([z.boolean(), z.number().int()]),
  created_at: z.string(),
  updated_at: z.string(),
  category_name: z.string().nullable(),
  person_name: z.string().nullable(),
});

export const PersonInputSchema = z.object({
  name: z.string().min(1),
});

export const CategoryInputSchema = z.object({
  name: z.string().min(1),
  icon: z.string().min(1).optional(),
});

export const ItemCreateInputSchema = z.object({
  name: z.string().min(1),
  category_id: z.number().int().nonnegative(),
  person_id: z.number().int().nonnegative(),
});

export const ItemUpdateInputSchema = z.object({
  name: z.string().min(1),
  category_id: z.number().int().nonnegative(),
});

export const RequiredItemInputSchema = z.object({
  name: z.string().min(1),
  category_id: z.number().int().nonnegative(),
  person_id: z.number().int().nonnegative().nullable().optional(),
  is_fulfilled: z.boolean().optional(),
});

export const RequiredItemAssignInputSchema = z.object({
  person_id: z.number().int().nonnegative().nullable(),
});
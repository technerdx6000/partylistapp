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
  type Category,
  type CategoryInput,
  type Item,
  type ItemCreateInput,
  type ItemUpdateInput,
  type Person,
  type PersonInput,
  type RequiredItem,
  type RequiredItemAssignInput,
  type RequiredItemInput,
} from "@listcollab/shared";
import { z } from "zod";

const API_BASE_URL = "/api";

const errorSchema = z.object({
  error: z.string(),
});

const deleteResponseSchema = z.object({
  message: z.string(),
});

const peopleSchema = z.array(PersonSchema);
const categoriesSchema = z.array(CategorySchema);
const itemsSchema = z.array(ItemSchema);
const requiredItemsSchema = z.array(RequiredItemSchema);

async function apiRequest<T>(
  endpoint: string,
  schema: z.ZodType<T>,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const config: RequestInit = {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const json = await response.json().catch(() => ({ error: "Unknown error" }));

    if (!response.ok) {
      const errorData = errorSchema.safeParse(json);
      throw new Error(errorData.success ? errorData.data.error : `HTTP ${response.status}`);
    }

    return schema.parse(json);
  } catch (error) {
    console.error(`API request failed: ${endpoint}`, error);
    throw error;
  }
}

export const peopleAPI = {
  getAll: (): Promise<Person[]> => apiRequest("/people", peopleSchema),

  getById: (id: number): Promise<Person> => apiRequest(`/people/${id}`, PersonSchema),

  create: (personData: PersonInput): Promise<Person> =>
    apiRequest("/people", PersonSchema, {
      method: "POST",
      body: JSON.stringify(PersonInputSchema.parse(personData)),
    }),

  update: (id: number, personData: PersonInput): Promise<Person> =>
    apiRequest(`/people/${id}`, PersonSchema, {
      method: "PUT",
      body: JSON.stringify(PersonInputSchema.parse(personData)),
    }),

  delete: (id: number): Promise<{ message: string }> =>
    apiRequest(`/people/${id}`, deleteResponseSchema, {
      method: "DELETE",
    }),
};

export const categoriesAPI = {
  getAll: (): Promise<Category[]> => apiRequest("/categories", categoriesSchema),

  create: (categoryData: CategoryInput): Promise<Category> =>
    apiRequest("/categories", CategorySchema, {
      method: "POST",
      body: JSON.stringify(CategoryInputSchema.parse(categoryData)),
    }),
};

export const itemsAPI = {
  getAll: (): Promise<Item[]> => apiRequest("/items", itemsSchema),

  getByPersonId: (personId: number): Promise<Item[]> => apiRequest(`/items/person/${personId}`, itemsSchema),

  create: (itemData: ItemCreateInput): Promise<Item> =>
    apiRequest("/items", ItemSchema, {
      method: "POST",
      body: JSON.stringify(ItemCreateInputSchema.parse(itemData)),
    }),

  update: (id: number, itemData: ItemUpdateInput): Promise<Item> =>
    apiRequest(`/items/${id}`, ItemSchema, {
      method: "PUT",
      body: JSON.stringify(ItemUpdateInputSchema.parse(itemData)),
    }),

  delete: (id: number): Promise<{ message: string }> =>
    apiRequest(`/items/${id}`, deleteResponseSchema, {
      method: "DELETE",
    }),
};

export const requiredItemsAPI = {
  getAll: (): Promise<RequiredItem[]> => apiRequest("/required-items", requiredItemsSchema),

  getById: (id: number): Promise<RequiredItem> => apiRequest(`/required-items/${id}`, RequiredItemSchema),

  create: (itemData: RequiredItemInput): Promise<RequiredItem> =>
    apiRequest("/required-items", RequiredItemSchema, {
      method: "POST",
      body: JSON.stringify(RequiredItemInputSchema.parse(itemData)),
    }),

  update: (id: number, itemData: RequiredItemInput): Promise<RequiredItem> =>
    apiRequest(`/required-items/${id}`, RequiredItemSchema, {
      method: "PUT",
      body: JSON.stringify(RequiredItemInputSchema.parse(itemData)),
    }),

  assign: (id: number, personId: number | null): Promise<RequiredItem> =>
    apiRequest(`/required-items/${id}/assign`, RequiredItemSchema, {
      method: "PATCH",
      body: JSON.stringify(
        RequiredItemAssignInputSchema.parse({
          person_id: personId,
        } satisfies RequiredItemAssignInput)
      ),
    }),

  delete: (id: number): Promise<{ message: string }> =>
    apiRequest(`/required-items/${id}`, deleteResponseSchema, {
      method: "DELETE",
    }),
};

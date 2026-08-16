import type { EventCategory, EventItemWithAssignments } from '@listcollab/shared'

export type GroupedItemsByCategory = {
  category: EventCategory | null
  items: readonly EventItemWithAssignments[]
  key: string
}

const UNCATEGORISED_GROUP_KEY = 'uncategorised'

export function getCategoryGroupKey(categoryId: number | null): string {
  return categoryId === null ? UNCATEGORISED_GROUP_KEY : String(categoryId)
}

export function groupItemsByCategory(
  categories: readonly EventCategory[],
  items: readonly EventItemWithAssignments[]
): readonly GroupedItemsByCategory[] {
  const uncategorisedItems = items.filter((item) => item.categoryId === null)
  const groupedCategories = categories
    .slice()
    .sort((leftCategory, rightCategory) => leftCategory.sortOrder - rightCategory.sortOrder)
    .map((category) => ({
      category,
      items: items.filter((item) => item.categoryId === category.id),
      key: getCategoryGroupKey(category.id),
    }))

  return uncategorisedItems.length > 0
    ? [
        ...groupedCategories,
        {
          category: null,
          items: uncategorisedItems,
          key: UNCATEGORISED_GROUP_KEY,
        },
      ]
    : groupedCategories
}
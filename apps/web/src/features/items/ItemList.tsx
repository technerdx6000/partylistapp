import type { EventCategory, EventItemWithAssignments, EventParticipant } from '@listcollab/shared'
import { Stack } from '@mui/material'

import { CategorySection } from '../categories/CategorySection'

type ItemListProps = {
  categories: readonly EventCategory[]
  items: readonly EventItemWithAssignments[]
  participants: readonly EventParticipant[]
}
export function ItemList({ categories, items, participants }: ItemListProps): React.JSX.Element {
  const uncategorisedItems = items.filter((item) => item.categoryId === null)
  const groupedCategories = categories
    .slice()
    .sort((leftCategory, rightCategory) => leftCategory.sortOrder - rightCategory.sortOrder)
    .map((category) => ({
      category,
      items: items.filter((item) => item.categoryId === category.id),
    }))
    .filter((group) => group.items.length > 0)

  return (
    <Stack spacing={3}>
      {groupedCategories.map((group) => (
        <CategorySection
          category={group.category}
          items={group.items}
          key={group.category.id}
          participants={participants}
        />
      ))}

      {uncategorisedItems.length > 0 ? (
        <CategorySection category={null} items={uncategorisedItems} participants={participants} />
      ) : null}
    </Stack>
  )
}
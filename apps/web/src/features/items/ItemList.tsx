import type { EventCategory, EventItemAssignment, EventItemWithAssignments, EventParticipant } from '@listcollab/shared'
import { Stack } from '@mui/material'

import type { EventIdentity } from '../../hooks/useEventIdentity'
import { CategorySection } from '../categories/CategorySection'

type ItemListProps = {
  categories: readonly EventCategory[]
  currentIdentity: EventIdentity | null
  isManageMode: boolean
  items: readonly EventItemWithAssignments[]
  onAddItem: (categoryId: number | null) => void
  onClaim: (item: EventItemWithAssignments, assignment?: EventItemAssignment) => void
  onDeleteCategory?: ((category: EventCategory) => void) | undefined
  onDeleteItem?: ((item: EventItemWithAssignments) => void) | undefined
  onEditCategory?: ((category: EventCategory) => void) | undefined
  onEditItem?: ((item: EventItemWithAssignments) => void) | undefined
  onMoveCategoryDown?: ((category: EventCategory) => void) | undefined
  onMoveCategoryUp?: ((category: EventCategory) => void) | undefined
  participants: readonly EventParticipant[]
}
export function ItemList({
  categories,
  currentIdentity,
  isManageMode,
  items,
  onAddItem,
  onClaim,
  onDeleteCategory,
  onDeleteItem,
  onEditCategory,
  onEditItem,
  onMoveCategoryDown,
  onMoveCategoryUp,
  participants,
}: ItemListProps): React.JSX.Element {
  const uncategorisedItems = items.filter((item) => item.categoryId === null)
  const groupedCategories = categories
    .slice()
    .sort((leftCategory, rightCategory) => leftCategory.sortOrder - rightCategory.sortOrder)
    .map((category) => ({
      category,
      items: items.filter((item) => item.categoryId === category.id),
    }))

  return (
    <Stack spacing={3}>
      {groupedCategories.map((group) => (
        <CategorySection
          canMoveDown={groupedCategories.indexOf(group) < groupedCategories.length - 1}
          canMoveUp={groupedCategories.indexOf(group) > 0}
          category={group.category}
          currentIdentity={currentIdentity}
          isManageMode={isManageMode}
          items={group.items}
          key={group.category.id}
          onAddItem={onAddItem}
          onClaim={onClaim}
          onDeleteCategory={onDeleteCategory}
          onDeleteItem={onDeleteItem}
          onEditCategory={onEditCategory}
          onEditItem={onEditItem}
          onMoveCategoryDown={onMoveCategoryDown}
          onMoveCategoryUp={onMoveCategoryUp}
          participants={participants}
        />
      ))}

      {uncategorisedItems.length > 0 ? (
        <CategorySection
          category={null}
          currentIdentity={currentIdentity}
          isManageMode={isManageMode}
          items={uncategorisedItems}
          onAddItem={onAddItem}
          onClaim={onClaim}
          onDeleteItem={onDeleteItem}
          onEditItem={onEditItem}
          participants={participants}
        />
      ) : null}
    </Stack>
  )
}
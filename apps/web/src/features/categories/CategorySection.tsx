import type { EventCategory, EventItemAssignment, EventItemWithAssignments, EventParticipant } from '@listcollab/shared'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import FolderOpenRoundedIcon from '@mui/icons-material/FolderOpenRounded'
import { Button, Chip, IconButton, Stack, Typography } from '@mui/material'

import type { EventIdentity } from '../../hooks/useEventIdentity'
import { getCategoryCoverageSummary } from '../events/eventCoverage'
import { ItemRow } from '../items/ItemRow'

type CategorySectionProps = {
  category: EventCategory | null
  currentIdentity: EventIdentity | null
  isManageMode: boolean
  items: readonly EventItemWithAssignments[]
  onAddItem: (categoryId: number | null) => void
  onClaim: (item: EventItemWithAssignments, assignment?: EventItemAssignment) => void
  onDeleteCategory?: ((category: EventCategory) => void) | undefined
  onDeleteItem?: ((item: EventItemWithAssignments) => void) | undefined
  onEditCategory?: ((category: EventCategory) => void) | undefined
  onEditItem?: ((item: EventItemWithAssignments) => void) | undefined
  participants: readonly EventParticipant[]
}

export function CategorySection({
  category,
  currentIdentity,
  isManageMode,
  items,
  onAddItem,
  onClaim,
  onDeleteCategory,
  onDeleteItem,
  onEditCategory,
  onEditItem,
  participants,
}: CategorySectionProps): React.JSX.Element {
  const icon = category?.icon ?? '•'
  const name = category?.name ?? 'Uncategorised'
  const coverageSummary = getCategoryCoverageSummary(items)
  const coverageLabel =
    coverageSummary.totalItems > 0
      ? `${coverageSummary.coveredItems} / ${coverageSummary.totalItems} covered`
      : coverageSummary.completedContributions > 0
        ? `${coverageSummary.completedContributions} extras ready`
        : 'No requirements'

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Stack spacing={0.75}>
          <Typography variant="h3">
            <Stack component="span" direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Typography component="span">{category ? icon : <FolderOpenRoundedIcon fontSize="small" />}</Typography>
              <Typography component="span" variant="inherit">
                {name}
              </Typography>
            </Stack>
          </Typography>
          <Chip icon={<CheckCircleRoundedIcon />} label={coverageLabel} size="small" variant="outlined" />
        </Stack>
        <Stack direction="row" spacing={0.5}>
          <Button onClick={() => onAddItem(category?.id ?? null)} size="small" startIcon={<AddRoundedIcon />} variant="text">
            {isManageMode ? 'Add item' : 'Add yours'}
          </Button>
          {isManageMode && category && onEditCategory ? (
            <IconButton aria-label={`Edit ${category.name}`} onClick={() => onEditCategory(category)} size="small">
              <EditRoundedIcon fontSize="small" />
            </IconButton>
          ) : null}
          {isManageMode && category && onDeleteCategory ? (
            <IconButton aria-label={`Delete ${category.name}`} color="error" onClick={() => onDeleteCategory(category)} size="small">
              <DeleteOutlineRoundedIcon fontSize="small" />
            </IconButton>
          ) : null}
        </Stack>
      </Stack>
      <Stack component="ul" spacing={1.25} sx={{ listStyle: 'none', m: 0, p: 0 }}>
        {items.length === 0 ? (
          <Typography color="text.secondary" component="li">
            No items in this category yet. Add the first one here.
          </Typography>
        ) : (
          items.map((item) => (
            <ItemRow
              currentIdentity={currentIdentity}
              isManageMode={isManageMode}
              item={item}
              key={item.id}
              onClaim={onClaim}
              onDeleteItem={onDeleteItem}
              onEditItem={onEditItem}
              participants={participants}
            />
          ))
        )}
      </Stack>
    </Stack>
  )
}
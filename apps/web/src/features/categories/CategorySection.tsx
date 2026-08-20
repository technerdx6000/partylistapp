import type { EventCategory, EventItemAssignment, EventItemWithAssignments, EventParticipant } from '@listcollab/shared'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded'
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import FolderOpenRoundedIcon from '@mui/icons-material/FolderOpenRounded'
import { Button, Chip, IconButton, Stack, Typography } from '@mui/material'

import { renderCategoryIcon } from './categoryIcons'
import { getCategoryCoverageSummary } from '../events/eventCoverage'
import { ItemRow } from '../items/ItemRow'

type CategorySectionProps = {
  canMoveDown?: boolean | undefined
  canMoveUp?: boolean | undefined
  category: EventCategory | null
  isManageMode: boolean
  items: readonly EventItemWithAssignments[]
  onAddItem: (categoryId: number | null) => void
  onClaim: (item: EventItemWithAssignments, assignment?: EventItemAssignment) => void
  onDeleteCategory?: ((category: EventCategory) => void) | undefined
  onDeleteItem?: ((item: EventItemWithAssignments) => void) | undefined
  onEditCategory?: ((category: EventCategory) => void) | undefined
  onEditItem?: ((item: EventItemWithAssignments) => void) | undefined
  onOpenItemDetail: (item: EventItemWithAssignments) => void
  onMoveCategoryDown?: ((category: EventCategory) => void) | undefined
  onMoveCategoryUp?: ((category: EventCategory) => void) | undefined
  participants: readonly EventParticipant[]
}

export function CategorySection({
  canMoveDown,
  canMoveUp,
  category,
  isManageMode,
  items,
  onAddItem,
  onClaim,
  onDeleteCategory,
  onDeleteItem,
  onEditCategory,
  onEditItem,
  onOpenItemDetail,
  onMoveCategoryDown,
  onMoveCategoryUp,
}: CategorySectionProps): React.JSX.Element {
  const name = category?.name ?? 'Uncategorised'
  const coverageSummary = getCategoryCoverageSummary(items)
  const coverageLabel = `${coverageSummary.readyItems} / ${coverageSummary.totalItems} items ready`

  return (
    <Stack spacing={1.5}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between' }}
      >
        <Stack spacing={0.75} sx={{ minWidth: 0 }}>
          <Typography variant="h3">
            <Stack component="span" direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
              <Typography component="span" sx={{ flexShrink: 0 }}>{category ? renderCategoryIcon(category.icon) : <FolderOpenRoundedIcon fontSize="small" />}</Typography>
              <Typography component="span" sx={{ minWidth: 0, overflowWrap: 'anywhere' }} variant="inherit">
                {name}
              </Typography>
            </Stack>
          </Typography>
          <Chip
            icon={<CheckCircleRoundedIcon />}
            label={coverageLabel}
            size="small"
            sx={{ alignSelf: 'flex-start', maxWidth: '100%', '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' } }}
            variant="outlined"
          />
        </Stack>
        <Stack
          direction="row"
          spacing={0.5}
          sx={{ flexWrap: 'wrap', gap: 0.5, justifyContent: { xs: 'flex-start', sm: 'flex-end' }, width: { xs: '100%', sm: 'auto' } }}
        >
          <Button onClick={() => onAddItem(category?.id ?? null)} size="small" startIcon={<AddRoundedIcon />} variant="text">
            {isManageMode ? 'Add item' : 'Add yours'}
          </Button>
          {isManageMode && category && onEditCategory ? (
            <IconButton aria-label={`Edit ${category.name}`} onClick={() => onEditCategory(category)} size="small">
              <EditRoundedIcon fontSize="small" />
            </IconButton>
          ) : null}
          {isManageMode && category && onMoveCategoryUp ? (
            <IconButton
              aria-label={`Move ${category.name} up`}
              disabled={!canMoveUp}
              onClick={() => onMoveCategoryUp(category)}
              size="small"
            >
              <ArrowUpwardRoundedIcon fontSize="small" />
            </IconButton>
          ) : null}
          {isManageMode && category && onMoveCategoryDown ? (
            <IconButton
              aria-label={`Move ${category.name} down`}
              disabled={!canMoveDown}
              onClick={() => onMoveCategoryDown(category)}
              size="small"
            >
              <ArrowDownwardRoundedIcon fontSize="small" />
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
              item={item}
              key={item.id}
              onClaim={onClaim}
              onDeleteItem={onDeleteItem}
              onEditItem={onEditItem}
              onOpenDetail={onOpenItemDetail}
            />
          ))
        )}
      </Stack>
    </Stack>
  )
}
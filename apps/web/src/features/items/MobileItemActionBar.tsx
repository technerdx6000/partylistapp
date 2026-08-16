import type { EventItemWithAssignments } from '@listcollab/shared'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import { Button, Chip, IconButton, Stack, Tooltip } from '@mui/material'

type MobileItemActionBarProps = {
  claimAriaLabel: string
  deleteAriaLabel: string
  editAriaLabel: string
  fullWidth?: boolean
  item: EventItemWithAssignments
  onClaim: (item: EventItemWithAssignments) => void
  onDelete?: ((item: EventItemWithAssignments) => void) | undefined
  onEdit?: ((item: EventItemWithAssignments) => void) | undefined
  statusLabel: string
}

/**
 * Renders the shared compact phone action bar used by minimal rows and detail dialogs.
 *
 * @param {MobileItemActionBarProps} props - Mobile item action callbacks and compact status copy.
 * @returns {React.JSX.Element} The compact mobile item action bar.
 */
export function MobileItemActionBar({
  claimAriaLabel,
  deleteAriaLabel,
  editAriaLabel,
  fullWidth = false,
  item,
  onClaim,
  onDelete,
  onEdit,
  statusLabel,
}: MobileItemActionBarProps): React.JSX.Element {
  return (
    <Stack direction="row" spacing={0.25} sx={{ alignItems: 'center', flexShrink: 0, minWidth: 0, width: fullWidth ? '100%' : 'auto' }}>
      {onEdit ? (
        <Tooltip title="Edit item">
          <IconButton aria-label={editAriaLabel} onClick={() => onEdit(item)} size="small" sx={{ flexShrink: 0, p: 0.5 }}>
            <EditRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : null}

      <Tooltip title={item.quantityRequired === null ? 'Claim contribution' : 'Claim item'}>
        <Button aria-label={claimAriaLabel} onClick={() => onClaim(item)} size="small" sx={{ flexShrink: 0, minWidth: 0, px: 0.75, py: 0.25, whiteSpace: 'nowrap' }} variant="text">
          Claim
        </Button>
      </Tooltip>

      {onDelete ? (
        <Tooltip title="Delete item">
          <IconButton aria-label={deleteAriaLabel} color="error" onClick={() => onDelete(item)} size="small" sx={{ flexShrink: 0, p: 0.5 }}>
            <DeleteOutlineRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : null}

      <Chip
        label={statusLabel}
        size="small"
        sx={{
          ...(fullWidth ? { marginLeft: 'auto', maxWidth: '48%' } : { maxWidth: '7.5rem' }),
          minWidth: 0,
          '& .MuiChip-label': {
            overflow: 'hidden',
            px: 0.75,
            textOverflow: 'ellipsis',
          },
        }}
      />
    </Stack>
  )
}
import type { EventItemAssignment, EventItemWithAssignments } from '@listcollab/shared'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import { Box, Button, ButtonBase, Card, Chip, IconButton, Tooltip, Typography, useMediaQuery, useTheme } from '@mui/material'

import { getCompactItemStatusLabel } from './itemPresentation'
import { MobileItemActionBar } from './MobileItemActionBar'

type ItemRowProps = {
  item: EventItemWithAssignments
  onClaim: (item: EventItemWithAssignments, assignment?: EventItemAssignment) => void
  onDeleteItem?: ((item: EventItemWithAssignments) => void) | undefined
  onEditItem?: ((item: EventItemWithAssignments) => void) | undefined
  onOpenDetail: (item: EventItemWithAssignments) => void
}

/**
 * Renders a single compact event item row that routes to detail surfaces.
 *
 * @param {ItemRowProps} props - The row data and mutation callbacks.
 * @returns {React.JSX.Element} The rendered item row.
 */
export function ItemRow({
  item,
  onClaim,
  onDeleteItem,
  onEditItem,
  onOpenDetail,
}: ItemRowProps): React.JSX.Element {
  const theme = useTheme()
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const compactStatus = getCompactItemStatusLabel(item)

  const actionButtons = (
    <>
      {onEditItem ? (
        <Tooltip title="Edit item">
          <IconButton
            aria-label={`Edit ${item.name}`}
            onClick={() => onEditItem(item)}
            size="small"
            sx={{ minHeight: 40, minWidth: 40 }}
          >
            <EditRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : null}

      <Tooltip title={item.quantityRequired === null ? 'Claim contribution' : 'Claim item'}>
        <Button
          aria-label={`Claim ${item.name}`}
          onClick={() => onClaim(item)}
          size="small"
          sx={{ minHeight: 40, px: 1.25 }}
          variant="text"
        >
          Claim
        </Button>
      </Tooltip>

      {onDeleteItem ? (
        <Tooltip title="Delete item">
          <IconButton
            aria-label={`Delete ${item.name}`}
            color="error"
            onClick={() => onDeleteItem(item)}
            size="small"
            sx={{ minHeight: 40, minWidth: 40 }}
          >
            <DeleteOutlineRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : null}
    </>
  )

  if (isSmallScreen) {
    return (
      <Card component="li" sx={{ listStyle: 'none' }} variant="outlined">
        <Box sx={{ alignItems: 'center', display: 'flex', gap: 0.5, minHeight: 52, px: 1, py: 0.75, width: '100%' }}>
          <ButtonBase
            aria-label={`Open ${item.name} details`}
            onClick={() => onOpenDetail(item)}
            sx={{ borderRadius: 1, display: 'flex', flex: 1, justifyContent: 'flex-start', minWidth: 0, px: 0.25, py: 0.25 }}
          >
            <Typography sx={{ minWidth: 0, overflow: 'hidden', textAlign: 'left', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }} title={item.name} variant="body1">
              {item.name}
            </Typography>
          </ButtonBase>

          <MobileItemActionBar
            claimAriaLabel={`Claim ${item.name}`}
            deleteAriaLabel={`Delete ${item.name}`}
            editAriaLabel={`Edit ${item.name}`}
            fullWidth={false}
            item={item}
            onClaim={onClaim}
            onDelete={onDeleteItem}
            onEdit={onEditItem}
            statusLabel={compactStatus}
          />
        </Box>
      </Card>
    )
  }

  return (
    <Card component="li" sx={{ listStyle: 'none' }} variant="outlined">
      <Box sx={{ alignItems: 'center', display: 'flex', gap: 1, minHeight: 56, px: 1.5, py: 1, width: '100%' }}>
        <ButtonBase
          aria-label={`Open ${item.name} details`}
          onClick={() => onOpenDetail(item)}
          sx={{ borderRadius: 1, display: 'flex', flex: 1, justifyContent: 'flex-start', minWidth: 0, px: 0.5, py: 0.5 }}
        >
          <Typography sx={{ minWidth: 0, overflow: 'hidden', textAlign: 'left', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }} title={item.name} variant="body1">
            {item.name}
          </Typography>
        </ButtonBase>

        {actionButtons}

        <Chip label={compactStatus} size="small" sx={{ flexShrink: 0 }} />
      </Box>
    </Card>
  )
}
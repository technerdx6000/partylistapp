import type { EventItemAssignment, EventItemWithAssignments } from '@listcollab/shared'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import { Box, Button, ButtonBase, Card, Chip, IconButton, Stack, Tooltip, Typography, useMediaQuery, useTheme } from '@mui/material'

import { getCompactItemStatusLabel } from './itemPresentation'

type ItemRowProps = {
  isManageMode: boolean
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
  isManageMode,
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
      {isManageMode && onEditItem ? (
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

      {isManageMode && onDeleteItem ? (
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
        <Stack spacing={1} sx={{ p: 1.25 }}>
          <ButtonBase
            aria-label={`Open ${item.name} details`}
            onClick={() => onOpenDetail(item)}
            sx={{ borderRadius: 1, display: 'flex', justifyContent: 'flex-start', px: 0.5, py: 0.5 }}
          >
            <Typography sx={{ overflow: 'hidden', textAlign: 'left', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }} title={item.name} variant="body1">
              {item.name}
            </Typography>
          </ButtonBase>

          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.75, justifyContent: 'space-between' }}>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
              {actionButtons}
            </Stack>
            <Chip label={compactStatus} size="small" sx={{ flexShrink: 0, maxWidth: '100%' }} />
          </Stack>
        </Stack>
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
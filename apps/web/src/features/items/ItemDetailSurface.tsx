import type { EventItemAssignment, EventItemWithAssignments, EventParticipant } from '@listcollab/shared'
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded'
import { Box, Button, Chip, Dialog, DialogContent, DialogTitle, Drawer, IconButton, LinearProgress, Stack, Tooltip, Typography, useMediaQuery, useTheme } from '@mui/material'

import { canEditAssignment, getContributionSummary, getItemStateMeta } from './itemPresentation'
import type { EventIdentity } from '../../hooks/useEventIdentity'

export type ItemDetailMode = 'view' | 'claim' | 'delete' | 'edit'

type ItemDetailSurfaceProps = {
  currentIdentity: EventIdentity | null
  isManageMode: boolean
  isOpen: boolean
  item: EventItemWithAssignments | null
  mode: ItemDetailMode
  onClose: () => void
  onDelete: (item: EventItemWithAssignments) => void
  onEdit: (item: EventItemWithAssignments) => void
  onOpenClaim: (item: EventItemWithAssignments, assignment?: EventItemAssignment) => void
  participants: readonly EventParticipant[]
}

function getModeHint(mode: ItemDetailMode): string | null {
  switch (mode) {
    case 'claim':
      return 'Claim this item from here.'
    case 'edit':
      return 'Edit this item from here.'
    case 'delete':
      return 'Delete this item from here.'
    case 'view':
      return null
    default:
      return null
  }
}

/**
 * Renders the richer item detail surface as a desktop flyout and mobile modal.
 *
 * @param {ItemDetailSurfaceProps} props - The selected item, mode, and action callbacks.
 * @returns {React.JSX.Element | null} The rendered item detail surface.
 */
export function ItemDetailSurface({
  currentIdentity,
  isManageMode,
  isOpen,
  item,
  mode,
  onClose,
  onDelete,
  onEdit,
  onOpenClaim,
  participants,
}: ItemDetailSurfaceProps): React.JSX.Element | null {
  const theme = useTheme()
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'))

  if (!item) {
    return null
  }

  const participantsById = new Map(participants.map((participant) => [participant.id, participant.name]))
  const stateMeta = getItemStateMeta(item)
  const hint = getModeHint(mode)
  const assignments = item.assignments
  const content = (
    <Stack spacing={2.5} sx={{ p: isSmallScreen ? 0 : 2.5, pt: isSmallScreen ? 0 : 1 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Stack spacing={0.75} sx={{ minWidth: 0 }}>
          <Typography sx={{ overflowWrap: 'anywhere' }} variant="h3">
            {item.name}
          </Typography>
          {hint ? (
            <Typography color="text.secondary" variant="body2">
              {hint}
            </Typography>
          ) : null}
        </Stack>
        <IconButton aria-label="Close item details" onClick={onClose}>
          <CloseRoundedIcon />
        </IconButton>
      </Stack>

      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Tooltip title={item.quantityRequired === null ? 'Claim contribution' : 'Claim item'}>
          <Button
            autoFocus={mode === 'claim'}
            onClick={() => onOpenClaim(item)}
            size="small"
            startIcon={item.quantityRequired === null ? <CampaignRoundedIcon /> : <Inventory2RoundedIcon />}
            variant="contained"
          >
            Claim
          </Button>
        </Tooltip>
        {isManageMode ? (
          <>
            <Tooltip title="Edit item">
              <Button autoFocus={mode === 'edit'} onClick={() => onEdit(item)} size="small" startIcon={<EditRoundedIcon />} variant="outlined">
                Edit
              </Button>
            </Tooltip>
            <Tooltip title="Delete item">
              <Button autoFocus={mode === 'delete'} color="error" onClick={() => onDelete(item)} size="small" startIcon={<DeleteOutlineRoundedIcon />} variant="outlined">
                Delete
              </Button>
            </Tooltip>
          </>
        ) : null}
        <Chip
          color={item.coverage.status === 'covered' || item.coverage.status === 'completed' || item.status === 'completed' ? 'success' : 'secondary'}
          icon={item.quantityRequired === null ? <CampaignRoundedIcon /> : <Inventory2RoundedIcon />}
          label={stateMeta.statusLabel}
          sx={{ maxWidth: '100%', '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' } }}
        />
      </Stack>

      {item.description ? (
        <Typography color="text.secondary" sx={{ overflowWrap: 'anywhere' }} variant="body2">
          {item.description}
        </Typography>
      ) : null}

      <Typography color="text.secondary" variant="body2">
        {getContributionSummary(item, participantsById)}
      </Typography>

      {item.quantityRequired !== null ? (
        <Stack spacing={0.5}>
          <LinearProgress
            aria-label={`${item.name} coverage progress`}
            color={item.coverage.status === 'covered' || item.status === 'completed' ? 'success' : 'primary'}
            value={Math.min((item.coverage.claimed / item.quantityRequired) * 100, 100)}
            variant="determinate"
          />
          <Typography color="text.secondary" variant="caption">
            {stateMeta.progressLabel}
          </Typography>
        </Stack>
      ) : null}

      {assignments.length > 0 ? (
        <Stack spacing={1}>
          <Typography variant="body2">Assignments</Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            {assignments.map((assignment) => {
              const label = `${participantsById.get(assignment.participantId) ?? 'Someone'} ×${assignment.quantity}`
              const interactive = canEditAssignment(assignment, currentIdentity, isManageMode)

              return (
                <Chip
                  clickable={interactive}
                  key={assignment.id}
                  label={label}
                  onClick={interactive ? () => onOpenClaim(item, assignment) : undefined}
                  sx={{ maxWidth: '100%', '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' } }}
                  title={label}
                  variant={interactive ? 'filled' : 'outlined'}
                />
              )
            })}
          </Stack>
        </Stack>
      ) : null}
    </Stack>
  )

  if (isSmallScreen) {
    return (
      <Dialog fullScreen onClose={onClose} open={isOpen}>
        <DialogTitle sx={{ pb: 1 }}>{item.name}</DialogTitle>
        <DialogContent>{content}</DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer anchor="right" onClose={onClose} open={isOpen} PaperProps={{ sx: { width: 440 } }}>
      <Box sx={{ p: 1.5 }}>
        {content}
      </Box>
    </Drawer>
  )
}
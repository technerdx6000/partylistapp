import type { EventItemAssignment, EventItemWithAssignments, EventParticipant } from '@listcollab/shared'
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded'
import { Box, Button, Card, CardContent, Chip, IconButton, LinearProgress, Stack, Typography } from '@mui/material'

import type { EventIdentity } from '../../hooks/useEventIdentity'

type ItemRowProps = {
  currentIdentity: EventIdentity | null
  isManageMode: boolean
  item: EventItemWithAssignments
  onClaim: (item: EventItemWithAssignments, assignment?: EventItemAssignment) => void
  onDeleteItem?: ((item: EventItemWithAssignments) => void) | undefined
  onEditItem?: ((item: EventItemWithAssignments) => void) | undefined
  participants: readonly EventParticipant[]
}

function formatAssignmentSummary(item: EventItemWithAssignments, participantsById: Map<number, string>): string {
  if (item.assignments.length === 0) {
    return item.quantityRequired === null ? 'No one has claimed this contribution yet.' : 'No one has claimed this yet.'
  }

  return item.assignments
    .map((assignment) => `${participantsById.get(assignment.participantId) ?? 'Someone'} ×${assignment.quantity}`)
    .join(' · ')
}

function getContributionSummary(item: EventItemWithAssignments, participantsById: Map<number, string>): string {
  const creatorName = item.createdBy ? participantsById.get(item.createdBy) : null

  if (item.quantityRequired === null) {
    if (item.assignments.length > 0) {
      return `${formatAssignmentSummary(item, participantsById)} is bringing this contribution.`
    }

    return creatorName ? `${creatorName} added this contribution.` : 'Open contribution'
  }

  return formatAssignmentSummary(item, participantsById)
}

function canEditAssignment(
  assignment: EventItemAssignment,
  currentIdentity: EventIdentity | null,
  isManageMode: boolean
): boolean {
  return isManageMode || currentIdentity?.participantId === assignment.participantId
}

export function ItemRow({
  currentIdentity,
  isManageMode,
  item,
  onClaim,
  onDeleteItem,
  onEditItem,
  participants,
}: ItemRowProps): React.JSX.Element {
  const participantsById = new Map(participants.map((participant) => [participant.id, participant.name]))
  const coverageLabel =
    item.coverage.required === null
      ? item.coverage.claimed > 0
        ? 'Contribution ready'
        : 'Open contribution'
      : `${item.coverage.claimed} / ${item.coverage.required} covered`

  return (
    <Card sx={{ borderColor: 'divider', borderStyle: 'solid', borderWidth: 1 }} variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h4">{item.name}</Typography>
              {item.description ? (
                <Typography color="text.secondary" variant="body2">
                  {item.description}
                </Typography>
              ) : null}
            </Box>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexShrink: 0 }}>
              {isManageMode && onEditItem ? (
                <IconButton aria-label={`Edit ${item.name}`} onClick={() => onEditItem(item)} size="small">
                  <EditRoundedIcon fontSize="small" />
                </IconButton>
              ) : null}
              {isManageMode && onDeleteItem ? (
                <IconButton aria-label={`Delete ${item.name}`} color="error" onClick={() => onDeleteItem(item)} size="small">
                  <DeleteOutlineRoundedIcon fontSize="small" />
                </IconButton>
              ) : null}
              <Chip
                color={item.coverage.status === 'covered' || item.coverage.status === 'completed' ? 'success' : 'secondary'}
                icon={item.quantityRequired === null ? <CampaignRoundedIcon /> : <Inventory2RoundedIcon />}
                label={coverageLabel}
              />
            </Stack>
          </Stack>

          <Typography color="text.secondary" variant="body2">
            {getContributionSummary(item, participantsById)}
          </Typography>

          {item.quantityRequired !== null ? (
            <Stack spacing={0.5}>
              <LinearProgress
                aria-label={`${item.name} coverage progress`}
                color={item.coverage.status === 'covered' ? 'success' : 'primary'}
                value={Math.min((item.coverage.claimed / item.quantityRequired) * 100, 100)}
                variant="determinate"
              />
              <Typography color="text.secondary" variant="caption">
                {item.coverage.status === 'covered' ? 'Covered' : `${item.coverage.remaining} still needed`}
              </Typography>
            </Stack>
          ) : null}

          {item.assignments.length > 0 ? (
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              {item.assignments.map((assignment) => {
                const label = `${participantsById.get(assignment.participantId) ?? 'Someone'} ×${assignment.quantity}`
                const interactive = canEditAssignment(assignment, currentIdentity, isManageMode)

                return (
                  <Chip
                    clickable={interactive}
                    key={assignment.id}
                    label={label}
                    onClick={interactive ? () => onClaim(item, assignment) : undefined}
                    variant={interactive ? 'filled' : 'outlined'}
                  />
                )
              })}
            </Stack>
          ) : null}

          <Button onClick={() => onClaim(item)} variant="outlined">
            {item.quantityRequired === null ? 'I am bringing this' : 'I will bring this'}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  )
}
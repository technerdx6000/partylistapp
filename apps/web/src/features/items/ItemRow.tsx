import type { EventItemAssignment, EventItemWithAssignments, EventParticipant } from '@listcollab/shared'
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded'
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded'
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded'
import { Box, Button, Card, CardContent, Chip, IconButton, LinearProgress, Stack, Typography } from '@mui/material'
import { useState } from 'react'

import type { EventIdentity } from '../../hooks/useEventIdentity'

const MAX_VISIBLE_ASSIGNMENTS = 3

type ItemRowProps = {
  currentIdentity: EventIdentity | null
  isManageMode: boolean
  item: EventItemWithAssignments
  onClaim: (item: EventItemWithAssignments, assignment?: EventItemAssignment) => void
  onDeleteItem?: ((item: EventItemWithAssignments) => void) | undefined
  onEditItem?: ((item: EventItemWithAssignments) => void) | undefined
  participants: readonly EventParticipant[]
}

/**
 * Formats a compact participant-by-quantity summary for an item's assignments.
 *
 * @param {EventItemWithAssignments} item - The item whose assignments are being summarised.
 * @param {Map<number, string>} participantsById - Participant names keyed by participant id.
 * @returns {string} A human-readable assignment summary.
 */
function formatAssignmentSummary(item: EventItemWithAssignments, participantsById: Map<number, string>): string {
  if (item.assignments.length === 0) {
    return item.quantityRequired === null ? 'No one has claimed this contribution yet.' : 'No one has claimed this yet.'
  }

  return item.assignments
    .map((assignment) => `${participantsById.get(assignment.participantId) ?? 'Someone'} ×${assignment.quantity}`)
    .join(' · ')
}

/**
 * Builds the descriptive secondary copy for a contribution or requirement.
 *
 * @param {EventItemWithAssignments} item - The item being rendered.
 * @param {Map<number, string>} participantsById - Participant names keyed by participant id.
 * @returns {string} The descriptive sentence shown under the item name.
 */
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

/**
 * Determines whether an assignment chip should be interactive for the current viewer.
 *
 * @param {EventItemAssignment} assignment - The assignment being rendered.
 * @param {EventIdentity | null} currentIdentity - The participant identity stored for this event, if any.
 * @param {boolean} isManageMode - True when the organiser token is active.
 * @returns {boolean} True when the assignment can be edited from this row.
 */
function canEditAssignment(
  assignment: EventItemAssignment,
  currentIdentity: EventIdentity | null,
  isManageMode: boolean
): boolean {
  return isManageMode || currentIdentity?.participantId === assignment.participantId
}

type ItemStateMeta = {
  progressLabel: string
  statusLabel: string
}

/**
 * Returns the textual state treatment for an item so status does not rely on colour alone.
 *
 * @param {EventItemWithAssignments} item - The item being rendered.
 * @returns {ItemStateMeta} Text labels for the item's state chip and progress copy.
 */
function getItemStateMeta(item: EventItemWithAssignments): ItemStateMeta {
  if (item.quantityRequired === null) {
    if (item.coverage.claimed === 0) {
      return {
        progressLabel: 'Waiting for someone to bring this contribution',
        statusLabel: 'Open contribution',
      }
    }

    return {
      progressLabel:
        item.status === 'completed' || item.coverage.status === 'completed'
          ? 'Marked complete by the organiser'
          : 'Someone is bringing this contribution',
      statusLabel:
        item.status === 'completed' || item.coverage.status === 'completed'
          ? 'Completed contribution'
          : 'Contribution ready',
    }
  }

  const coveragePrefix = item.coverage.claimed === 0 ? 'Open' : item.coverage.remaining === 0 ? 'Covered' : 'Partly covered'

  if (item.status === 'completed') {
    return {
      progressLabel: 'Marked complete by the organiser',
      statusLabel: `Completed · ${item.coverage.claimed} / ${item.coverage.required}`,
    }
  }

  if (item.coverage.remaining === 0) {
    return {
      progressLabel: 'All required quantities are claimed',
      statusLabel: `Covered · ${item.coverage.claimed} / ${item.coverage.required}`,
    }
  }

  return {
    progressLabel:
      item.coverage.claimed === 0
        ? `${item.coverage.required} still needed`
        : `${item.coverage.remaining} still needed`,
    statusLabel: `${coveragePrefix} · ${item.coverage.claimed} / ${item.coverage.required}`,
  }
}

/**
 * Renders a single event item row with mobile-safe status and assignment presentation.
 *
 * @param {ItemRowProps} props - The row data and mutation callbacks.
 * @returns {React.JSX.Element} The rendered item row.
 */
export function ItemRow({
  currentIdentity,
  isManageMode,
  item,
  onClaim,
  onDeleteItem,
  onEditItem,
  participants,
}: ItemRowProps): React.JSX.Element {
  const [assignmentsExpanded, setAssignmentsExpanded] = useState(false)
  const participantsById = new Map(participants.map((participant) => [participant.id, participant.name]))
  const stateMeta = getItemStateMeta(item)
  const hiddenAssignmentsCount = Math.max(item.assignments.length - MAX_VISIBLE_ASSIGNMENTS, 0)
  const visibleAssignments = assignmentsExpanded ? item.assignments : item.assignments.slice(0, MAX_VISIBLE_ASSIGNMENTS)

  return (
    <Card component="li" sx={{ borderColor: 'divider', borderStyle: 'solid', borderWidth: 1, listStyle: 'none' }} variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ overflowWrap: 'anywhere' }} title={item.name} variant="h4">
                {item.name}
              </Typography>
              {item.description ? (
                <Typography color="text.secondary" sx={{ overflowWrap: 'anywhere' }} title={item.description} variant="body2">
                  {item.description}
                </Typography>
              ) : null}
            </Box>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexShrink: 0 }}>
              {isManageMode && onEditItem ? (
                <IconButton aria-label={`Edit ${item.name}`} onClick={() => onEditItem(item)} size="small" sx={{ minHeight: 44, minWidth: 44 }}>
                  <EditRoundedIcon fontSize="small" />
                </IconButton>
              ) : null}
              {isManageMode && onDeleteItem ? (
                <IconButton aria-label={`Delete ${item.name}`} color="error" onClick={() => onDeleteItem(item)} size="small" sx={{ minHeight: 44, minWidth: 44 }}>
                  <DeleteOutlineRoundedIcon fontSize="small" />
                </IconButton>
              ) : null}
              <Chip
                color={item.coverage.status === 'covered' || item.coverage.status === 'completed' || item.status === 'completed' ? 'success' : 'secondary'}
                icon={item.quantityRequired === null ? <CampaignRoundedIcon /> : <Inventory2RoundedIcon />}
                label={stateMeta.statusLabel}
                sx={{ maxWidth: '100%' }}
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
                color={item.coverage.status === 'covered' || item.status === 'completed' ? 'success' : 'primary'}
                value={Math.min((item.coverage.claimed / item.quantityRequired) * 100, 100)}
                variant="determinate"
              />
              <Typography color="text.secondary" variant="caption">
                {stateMeta.progressLabel}
              </Typography>
            </Stack>
          ) : null}

          {item.assignments.length > 0 ? (
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                {visibleAssignments.map((assignment) => {
                  const label = `${participantsById.get(assignment.participantId) ?? 'Someone'} ×${assignment.quantity}`
                  const interactive = canEditAssignment(assignment, currentIdentity, isManageMode)

                  return (
                    <Chip
                      clickable={interactive}
                      key={assignment.id}
                      label={label}
                      onClick={interactive ? () => onClaim(item, assignment) : undefined}
                      sx={{ maxWidth: '100%', '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' } }}
                      title={label}
                      variant={interactive ? 'filled' : 'outlined'}
                    />
                  )
                })}
              </Stack>

              {hiddenAssignmentsCount > 0 ? (
                <Button
                  onClick={() => setAssignmentsExpanded((currentValue) => !currentValue)}
                  size="small"
                  startIcon={assignmentsExpanded ? <ExpandLessRoundedIcon /> : <ExpandMoreRoundedIcon />}
                  sx={{ alignSelf: 'flex-start', minHeight: 44 }}
                  variant="text"
                >
                  {assignmentsExpanded ? 'Show fewer claims' : `Show ${hiddenAssignmentsCount} more claim${hiddenAssignmentsCount === 1 ? '' : 's'}`}
                </Button>
              ) : null}
            </Stack>
          ) : null}

          <Button onClick={() => onClaim(item)} sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' }, minHeight: 44 }} variant="outlined">
            {item.quantityRequired === null ? 'I am bringing this' : 'I will bring this'}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  )
}
import type { EventItemWithAssignments, EventParticipant } from '@listcollab/shared'
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded'
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded'
import { Box, Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material'

type ItemRowProps = {
  item: EventItemWithAssignments
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

export function ItemRow({ item, participants }: ItemRowProps): React.JSX.Element {
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
            <Chip
              color={item.coverage.status === 'covered' || item.coverage.status === 'completed' ? 'success' : 'secondary'}
              icon={item.quantityRequired === null ? <CampaignRoundedIcon /> : <Inventory2RoundedIcon />}
              label={coverageLabel}
              sx={{ flexShrink: 0 }}
            />
          </Stack>

          <Typography color="text.secondary" variant="body2">
            {getContributionSummary(item, participantsById)}
          </Typography>

          <Button disabled variant="outlined">
            Claiming opens in Phase 6
          </Button>
        </Stack>
      </CardContent>
    </Card>
  )
}
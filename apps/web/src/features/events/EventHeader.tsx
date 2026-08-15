import type { CoverageSummary, Event } from '@listcollab/shared'
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded'
import LinkRoundedIcon from '@mui/icons-material/LinkRounded'
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded'
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded'
import { Alert, Chip, Divider, Stack, TextField, Typography } from '@mui/material'

type EventHeaderProps = {
  adminLink: string | null
  event: Event
  isManageMode: boolean
  participantsCount: number
  coverageSummary: CoverageSummary
}

export function EventHeader({
  adminLink,
  event,
  isManageMode,
  participantsCount,
  coverageSummary,
}: EventHeaderProps): React.JSX.Element {
  return (
    <Stack spacing={2.5}>
      {isManageMode && adminLink ? (
        <Alert color="warning" icon={<ShieldRoundedIcon fontSize="inherit" />}>
          <Stack spacing={1.5}>
            <Typography variant="body2">
              Keep this organiser link safe. It is the only way to keep organiser access for this event.
            </Typography>
            <TextField
              InputProps={{ readOnly: true }}
              label="Organiser link"
              size="small"
              value={adminLink}
            />
          </Stack>
        </Alert>
      ) : null}

      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
        <Chip color="primary" label={`${participantsCount} people`} />
        <Chip
          color={coverageSummary.status === 'covered' ? 'success' : 'secondary'}
          label={
            coverageSummary.required === null
              ? `${coverageSummary.claimed} claimed`
              : `${coverageSummary.claimed} / ${coverageSummary.required} items covered`
          }
        />
        {isManageMode ? <Chip icon={<ShieldRoundedIcon />} label="Organiser mode" variant="outlined" /> : null}
      </Stack>

      <Stack spacing={1.25}>
        <Typography variant="h2">{event.name}</Typography>
        <Stack direction="row" spacing={2} sx={{ color: 'text.secondary', flexWrap: 'wrap', gap: 1 }}>
          {event.eventDate ? (
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
              <CalendarMonthRoundedIcon fontSize="small" />
              <Typography variant="body2">{event.eventDate}</Typography>
            </Stack>
          ) : null}
          {event.location ? (
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
              <PlaceRoundedIcon fontSize="small" />
              <Typography variant="body2">{event.location}</Typography>
            </Stack>
          ) : null}
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            <LinkRoundedIcon fontSize="small" />
            <Typography variant="body2">Share token: {event.shareToken}</Typography>
          </Stack>
        </Stack>
      </Stack>

      {event.description ? (
        <>
          <Divider />
          <Typography color="text.secondary">{event.description}</Typography>
        </>
      ) : null}
    </Stack>
  )
}
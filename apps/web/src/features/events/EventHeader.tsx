import type { Event } from '@listcollab/shared'
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded'
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded'
import LinkRoundedIcon from '@mui/icons-material/LinkRounded'
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded'
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded'
import { Alert, Chip, Divider, IconButton, InputAdornment, Stack, TextField, Typography } from '@mui/material'

import type { ItemProgressSummary } from './eventCoverage'

type EventHeaderProps = {
  adminLink: string | null
  isCondensed?: boolean
  event: Event
  isManageMode: boolean
  onCopyAdminLink?: (() => void) | undefined
  participantsCount: number
  coverageSummary: ItemProgressSummary
}

/**
 * Renders the event summary header for guest and organiser views.
 *
 * The header supports a condensed mode for scrolled mobile layouts so the
 * item list stays in focus without losing the key event summary.
 *
 * @param {EventHeaderProps} props - Event summary data and organiser context.
 * @returns {React.JSX.Element} The rendered event header.
 */
export function EventHeader({
  adminLink,
  isCondensed = false,
  event,
  isManageMode,
  onCopyAdminLink,
  participantsCount,
  coverageSummary,
}: EventHeaderProps): React.JSX.Element {
  return (
    <Stack spacing={isCondensed ? 1.5 : 2.5}>
      {isManageMode && adminLink && !isCondensed ? (
        <Alert color="warning" icon={<ShieldRoundedIcon fontSize="inherit" />}>
          <Stack spacing={1.5}>
            <Typography variant="body2">
              Keep this organiser link safe. It is the only way to keep organiser access for this event.
            </Typography>
            <TextField
              InputProps={{
                readOnly: true,
                endAdornment: onCopyAdminLink ? (
                  <InputAdornment position="end">
                    <IconButton aria-label="Copy organiser link" edge="end" onClick={onCopyAdminLink} size="small">
                      <ContentCopyRoundedIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : undefined,
              }}
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
          color={coverageSummary.readyItems === coverageSummary.totalItems && coverageSummary.totalItems > 0 ? 'success' : 'secondary'}
          label={`${coverageSummary.readyItems} / ${coverageSummary.totalItems} items ready`}
        />
        {isManageMode ? <Chip icon={<ShieldRoundedIcon />} label="Organiser mode" variant="outlined" /> : null}
      </Stack>

      <Stack spacing={isCondensed ? 0.75 : 1.25}>
        <Typography variant={isCondensed ? 'h3' : 'h2'}>{event.name}</Typography>
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
          {!isCondensed ? (
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
              <LinkRoundedIcon fontSize="small" />
              <Typography variant="body2">Share token: {event.shareToken}</Typography>
            </Stack>
          ) : null}
        </Stack>
      </Stack>

      {event.description && !isCondensed ? (
        <>
          <Divider />
          <Typography color="text.secondary">{event.description}</Typography>
        </>
      ) : null}
    </Stack>
  )
}
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import GroupRoundedIcon from '@mui/icons-material/GroupRounded'
import PlaylistAddRoundedIcon from '@mui/icons-material/PlaylistAddRounded'
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded'
import { Button, Divider, Stack, Typography } from '@mui/material'

type MobileOrganiserPanelProps = {
  onAddCategory: () => void
  onAddRequirement: () => void
  onDeleteEvent: () => void
  onEditEvent: () => void
  onOpenParticipants: () => void
  participantsCount: number
}

/**
 * Renders a compact organiser control surface for phone-sized event pages.
 *
 * @param {MobileOrganiserPanelProps} props - The mobile organiser actions and participant summary.
 * @returns {React.JSX.Element} The compact organiser action panel.
 */
export function MobileOrganiserPanel({
  onAddCategory,
  onAddRequirement,
  onDeleteEvent,
  onEditEvent,
  onOpenParticipants,
  participantsCount,
}: MobileOrganiserPanelProps): React.JSX.Element {
  const participantLabel = `${participantsCount} participant${participantsCount === 1 ? '' : 's'}`

  return (
    <Stack spacing={1.5}>
      <Divider />
      <Typography color="text.secondary" variant="body2">
        {participantsCount > 0
          ? `${participantLabel} so far. Manage details, requirements, categories, and people from here.`
          : 'No participants yet. Manage details, requirements, categories, and people from here.'}
      </Typography>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
        <Button onClick={onEditEvent} size="small" startIcon={<SettingsRoundedIcon />} variant="outlined">
          Edit event
        </Button>
        <Button onClick={onAddRequirement} size="small" startIcon={<PlaylistAddRoundedIcon />} variant="outlined">
          Add requirement
        </Button>
        <Button onClick={onAddCategory} size="small" startIcon={<CategoryRoundedIcon />} variant="outlined">
          Add category
        </Button>
        <Button onClick={onOpenParticipants} size="small" startIcon={<GroupRoundedIcon />} variant="outlined">
          Participants
        </Button>
      </Stack>
      <Button color="error" onClick={onDeleteEvent} size="small" startIcon={<DeleteOutlineRoundedIcon />} sx={{ alignSelf: 'flex-start' }} variant="text">
        Delete event
      </Button>
    </Stack>
  )
}
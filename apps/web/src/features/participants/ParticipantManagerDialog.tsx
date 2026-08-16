import type { EventParticipant } from '@listcollab/shared'
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, List, ListItem, ListItemSecondaryAction, ListItemText, Stack, Typography, useMediaQuery, useTheme } from '@mui/material'

type ParticipantManagerDialogProps = {
  isOpen: boolean
  onClose: () => void
  onRemoveParticipant: (participant: EventParticipant) => void
  participants: readonly EventParticipant[]
}

/**
 * Renders the organiser-only participant management dialog for small screens.
 *
 * @param {ParticipantManagerDialogProps} props - The dialog state, participants, and removal action.
 * @returns {React.JSX.Element} The participant management dialog.
 */
export function ParticipantManagerDialog({
  isOpen,
  onClose,
  onRemoveParticipant,
  participants,
}: ParticipantManagerDialogProps): React.JSX.Element {
  const theme = useTheme()
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'))

  return (
    <Dialog fullScreen={isSmallScreen} fullWidth maxWidth="sm" onClose={onClose} open={isOpen}>
      <DialogTitle>Participants</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {participants.length === 0 ? (
            <Typography color="text.secondary">
              No participants yet. Claims will appear here as people identify themselves.
            </Typography>
          ) : (
            <List disablePadding>
              {participants.map((participant) => (
                <ListItem divider key={participant.id}>
                  <ListItemText primary={participant.name} />
                  <ListItemSecondaryAction>
                    <Button color="error" onClick={() => onRemoveParticipant(participant)} variant="text">
                      Remove
                    </Button>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button autoFocus onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}
import type { EventParticipant } from '@listcollab/shared'
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { useState } from 'react'

import type { EventIdentity } from '../../hooks/useEventIdentity'

type IdentifyDialogProps = {
  existingParticipants: readonly EventParticipant[]
  isOpen: boolean
  onClose: () => void
  onCreateParticipant: (displayName: string) => Promise<EventIdentity>
  onSelectParticipant: (participant: EventParticipant) => void
}

export function IdentifyDialog({
  existingParticipants,
  isOpen,
  onClose,
  onCreateParticipant,
  onSelectParticipant,
}: IdentifyDialogProps): React.JSX.Element {
  const theme = useTheme()
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const [displayName, setDisplayName] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function handleCreateParticipant(): Promise<void> {
    const trimmedName = displayName.trim()

    if (!trimmedName) {
      return
    }

    setErrorMessage(null)
    setIsSaving(true)

    try {
      await onCreateParticipant(trimmedName)
      setDisplayName('')
    } catch {
      setErrorMessage('We could not save that name. Try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog fullScreen={isSmallScreen} fullWidth maxWidth="xs" onClose={onClose} open={isOpen}>
      <DialogTitle>Who are you?</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography color="text.secondary">
            Pick your name or add yourself so your claims stay linked to the right person for this event.
          </Typography>

          {errorMessage ? <Alert color="error">{errorMessage}</Alert> : null}

          <List disablePadding>
            {existingParticipants.map((participant) => (
              <ListItemButton key={participant.id} onClick={() => onSelectParticipant(participant)}>
                <ListItemText primary={participant.name} />
              </ListItemButton>
            ))}
          </List>

          <TextField
            autoFocus
            label="Add your name"
            onChange={(event) => setDisplayName(event.target.value)}
            value={displayName}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button disabled={isSaving || !displayName.trim()} onClick={() => void handleCreateParticipant()} variant="contained">
          {isSaving ? 'Saving…' : 'Continue'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
import type { EventItemAssignment, EventItemWithAssignments, EventParticipant } from '@listcollab/shared'
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'

import { ConfirmationDialog } from '../../components/ConfirmationDialog'
import type { EventIdentity } from '../../hooks/useEventIdentity'

type ClaimItemDialogProps = {
  assignment?: EventItemAssignment
  identity: EventIdentity | null
  isManageMode: boolean
  isOpen: boolean
  item: EventItemWithAssignments | null
  onClose: () => void
  onDeleteAssignment: (assignmentId: number, participantId: number) => Promise<void>
  onSave: (payload: { participantId: number; quantity: number; note: string | null }) => Promise<void>
  participants: readonly EventParticipant[]
}

function getDefaultQuantity(item: EventItemWithAssignments | null, assignmentId?: number): number {
  if (!item) {
    return 1
  }

  const existingAssignment = assignmentId
    ? item.assignments.find((assignment) => assignment.id === assignmentId)
    : null

  if (existingAssignment) {
    return existingAssignment.quantity
  }

  if (item.coverage.remaining === null) {
    return 1
  }

  return Math.max(item.coverage.remaining, 1)
}

export function ClaimItemDialog({
  assignment,
  identity,
  isManageMode,
  isOpen,
  item,
  onClose,
  onDeleteAssignment,
  onSave,
  participants,
}: ClaimItemDialogProps): React.JSX.Element {
  const theme = useTheme()
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const existingAssignment = useMemo(() => assignment ?? null, [assignment])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [note, setNote] = useState(existingAssignment?.note ?? '')
  const [participantId, setParticipantId] = useState<number | ''>(identity?.participantId ?? '')
  const [quantity, setQuantity] = useState(getDefaultQuantity(item, existingAssignment?.id))

  useEffect(() => {
    setErrorMessage(null)
    setNote(existingAssignment?.note ?? '')
    setParticipantId(existingAssignment?.participantId ?? identity?.participantId ?? '')
    setQuantity(getDefaultQuantity(item, existingAssignment?.id))
  }, [existingAssignment?.id, existingAssignment?.note, existingAssignment?.participantId, identity?.participantId, item])

  async function handleSave(): Promise<void> {
    if (!participantId) {
      return
    }

    setErrorMessage(null)
    setIsSaving(true)

    try {
      await onSave({
        note: note.trim() ? note.trim() : null,
        participantId,
        quantity,
      })
    } catch {
      setErrorMessage('That claim could not be saved. Refresh and try again.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(): Promise<void> {
    if (!existingAssignment) {
      return
    }

    setErrorMessage(null)
    setIsSaving(true)

    try {
      await onDeleteAssignment(existingAssignment.id, existingAssignment.participantId)
      setIsRemoveDialogOpen(false)
    } catch {
      setErrorMessage('That claim could not be removed. Refresh and try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const remainingLabel = item?.coverage.remaining === null ? 'Open contribution' : `${item?.coverage.remaining ?? 0} remaining`

  return (
    <>
      <Dialog fullScreen={isSmallScreen} fullWidth maxWidth="xs" onClose={onClose} open={isOpen}>
        <DialogTitle>{existingAssignment ? 'Adjust claim' : 'Claim item'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography color="text.secondary">{item?.name ?? 'Item'} · {remainingLabel}</Typography>

            {errorMessage ? <Alert color="error">{errorMessage}</Alert> : null}

            <FormControl fullWidth>
              <InputLabel>Who are you?</InputLabel>
              <Select
                disabled={!isManageMode && Boolean(identity?.participantId)}
                label="Who are you?"
                onChange={(event) => setParticipantId(Number(event.target.value))}
                value={participantId}
              >
                {participants.map((participant) => (
                  <MenuItem key={participant.id} value={participant.id}>
                    {participant.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              inputProps={{ min: 1, max: item?.coverage.remaining ?? undefined }}
              label="Quantity"
              onChange={(event) => setQuantity(Math.max(Number(event.target.value) || 1, 1))}
              type="number"
              value={quantity}
            />

            <TextField
              label="Optional note"
              multiline
              minRows={2}
              onChange={(event) => setNote(event.target.value)}
              value={note}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          {existingAssignment ? (
            <Button color="error" disabled={isSaving} onClick={() => setIsRemoveDialogOpen(true)}>
              Remove claim
            </Button>
          ) : null}
          <Button onClick={onClose}>Cancel</Button>
          <Button disabled={isSaving || !participantId} onClick={() => void handleSave()} variant="contained">
            {isSaving ? 'Saving…' : existingAssignment ? 'Update claim' : 'Claim item'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmationDialog
        confirmButtonLabel="Remove claim"
        description="Remove this claim? This frees the quantity for someone else to bring."
        isConfirming={isSaving}
        isOpen={isRemoveDialogOpen}
        onClose={() => {
          if (!isSaving) {
            setIsRemoveDialogOpen(false)
          }
        }}
        onConfirm={() => {
          void handleDelete()
        }}
        title="Remove claim"
      />
    </>
  )
}
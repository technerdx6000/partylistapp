import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography, useMediaQuery, useTheme } from '@mui/material'
import { useEffect, useState } from 'react'

type ConfirmationDialogProps = {
  confirmButtonLabel: string
  confirmationLabel?: string
  confirmationValue?: string
  description: string
  errorMessage?: string | null
  isConfirming?: boolean
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
}

export function ConfirmationDialog({
  confirmButtonLabel,
  confirmationLabel,
  confirmationValue,
  description,
  errorMessage = null,
  isConfirming = false,
  isOpen,
  onClose,
  onConfirm,
  title,
}: ConfirmationDialogProps): React.JSX.Element {
  const theme = useTheme()
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const [typedValue, setTypedValue] = useState('')

  useEffect(() => {
    if (isOpen) {
      setTypedValue('')
    }
  }, [isOpen])

  const confirmationMatches = confirmationValue ? typedValue.trim() === confirmationValue : true

  return (
    <Dialog fullScreen={isSmallScreen} fullWidth maxWidth="xs" onClose={onClose} open={isOpen}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography color="text.secondary">{description}</Typography>

          {errorMessage ? <Alert color="error">{errorMessage}</Alert> : null}

          {confirmationValue && confirmationLabel ? (
            <TextField
              autoFocus
              label={confirmationLabel}
              onChange={(event) => setTypedValue(event.target.value)}
              value={typedValue}
            />
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button autoFocus onClick={onClose}>
          Cancel
        </Button>
        <Button color="error" disabled={!confirmationMatches || isConfirming} onClick={onConfirm} variant="contained">
          {isConfirming ? 'Working…' : confirmButtonLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
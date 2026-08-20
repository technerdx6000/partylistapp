import {
  CreateItemRequestSchema,
  UpdateItemRequestSchema,
  type CreateItemRequest,
  type EventCategory,
  type EventItemWithAssignments,
  type UpdateItemRequest,
} from '@listcollab/shared'
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
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { useEffect, useState } from 'react'

import type { EventIdentity } from '../../hooks/useEventIdentity'
import { ApiClientError } from '../../services/apiClient'

type ItemFormMode = 'guest-create' | 'manage-create' | 'manage-edit' | 'guest-edit'

export type ItemFormCreatePayload = CreateItemRequest & {
  claimQuantity?: number
}

type ItemFormProps = {
  categories: readonly EventCategory[]
  existingItems?: readonly EventItemWithAssignments[]
  guestParticipantId: number | null
  identity: EventIdentity | null
  initialCategoryId: number | null
  isOpen: boolean
  item: EventItemWithAssignments | null
  mode: ItemFormMode
  onClose: () => void
  onCreate: (payload: ItemFormCreatePayload) => Promise<void>
  onRequireIdentity?: () => void
  onUpdate: (itemId: number, payload: UpdateItemRequest) => Promise<void>
}

type ItemFormFieldName = 'categoryId' | 'description' | 'name' | 'quantityRequired'

type ItemFormErrors = Partial<Record<ItemFormFieldName, string>>

function getQuantityValidationMessage(quantityInput: string): string | null {
  if (quantityInput === '') {
    return 'Quantity is required'
  }

  const quantity = Number(quantityInput)

  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
    return 'Enter a whole number between 1 and 999'
  }

  return null
}

function normalizeItemName(name: string): string {
  return name.trim().toLocaleLowerCase()
}

/** Collects item create and edit payloads for guest and organiser item flows. */
export function ItemForm({
  categories,
  existingItems = [],
  guestParticipantId,
  identity,
  initialCategoryId,
  isOpen,
  item,
  mode,
  onClose,
  onCreate,
  onRequireIdentity,
  onUpdate,
}: ItemFormProps): React.JSX.Element {
  const theme = useTheme()
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const [categoryId, setCategoryId] = useState<number | null>(item?.categoryId ?? initialCategoryId)
  const [description, setDescription] = useState(item?.description ?? '')
  const [fieldErrors, setFieldErrors] = useState<ItemFormErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [name, setName] = useState(item?.name ?? '')
  const [quantityInput, setQuantityInput] = useState(String(item?.quantityRequired ?? 1))
  const isQuantityFieldVisible = mode === 'guest-create' || mode === 'manage-create' || (item?.quantityRequired ?? null) !== null
  const quantityValidationMessage = isQuantityFieldVisible ? getQuantityValidationMessage(quantityInput) : null

  useEffect(() => {
    setCategoryId(item?.categoryId ?? initialCategoryId)
    setDescription(item?.description ?? '')
    setFieldErrors({})
    setFormError(null)
    setName(item?.name ?? '')
    setQuantityInput(String(item?.quantityRequired ?? 1))
  }, [initialCategoryId, item])

  function setValidationErrors(issues: ReadonlyArray<{ message: string; path: readonly (string | number)[] }>): void {
    const nextFieldErrors: ItemFormErrors = {}

    for (const issue of issues) {
      const fieldName = String(issue.path[0] ?? 'name') as ItemFormFieldName

      nextFieldErrors[fieldName] ??= issue.message
    }

    setFieldErrors(nextFieldErrors)
  }

  function getDuplicateNameMessage(trimmedName: string): string | null {
    const normalizedName = normalizeItemName(trimmedName)
    const duplicateItem = existingItems.find((existingItem) => {
      if (item && existingItem.id === item.id) {
        return false
      }

      return normalizeItemName(existingItem.name) === normalizedName
    })

    return duplicateItem ? 'That item name is already in use for this event.' : null
  }

  async function handleSubmit(): Promise<void> {
    setFieldErrors({})
    setFormError(null)
    setIsSaving(true)

    try {
      const trimmedName = name.trim()
      const parsedQuantity = isQuantityFieldVisible ? Number(quantityInput) : null
      const duplicateNameMessage = trimmedName ? getDuplicateNameMessage(trimmedName) : null

      if (duplicateNameMessage) {
        setFieldErrors({ name: duplicateNameMessage })
        return
      }

      if (
        quantityValidationMessage ||
        (isQuantityFieldVisible && !Number.isInteger(parsedQuantity))
      ) {
        return
      }

      if (mode === 'guest-create' || mode === 'manage-create') {
        const createdBy = mode === 'guest-create' ? (guestParticipantId ?? identity?.participantId ?? null) : null

        if (mode === 'guest-create' && createdBy === null) {
          onRequireIdentity?.()

          if (!onRequireIdentity) {
            setFormError('Choose who you are before adding a contribution.')
          }

          return
        }

        const parsedPayload = CreateItemRequestSchema.safeParse({
          categoryId,
          createdBy,
          description: description.trim() ? description.trim() : null,
          name: trimmedName,
          quantityRequired: mode === 'guest-create' ? null : parsedQuantity,
        })

        if (!parsedPayload.success) {
          setValidationErrors(parsedPayload.error.issues)
          return
        }

        await onCreate(mode === 'guest-create' ? { ...parsedPayload.data, claimQuantity: parsedQuantity ?? 1 } : parsedPayload.data)
      } else if (item) {
        const parsedPayload = UpdateItemRequestSchema.safeParse({
          categoryId,
          description: description.trim() ? description.trim() : null,
          name: trimmedName,
          quantityRequired: item.quantityRequired !== null ? parsedQuantity : undefined,
        })

        if (!parsedPayload.success) {
          setValidationErrors(parsedPayload.error.issues)
          return
        }

        await onUpdate(item.id, parsedPayload.data)
      }
    } catch (caughtError) {
      if (caughtError instanceof ApiClientError && caughtError.code === 'ITEM_ALREADY_EXISTS') {
        setFieldErrors({ name: 'That item name is already in use for this event.' })
        return
      }

      setFormError('We could not save that item. Try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog fullScreen={isSmallScreen} fullWidth maxWidth="sm" onClose={onClose} open={isOpen}>
      <DialogTitle>
        {mode === 'guest-create' && 'Add your contribution'}
        {mode === 'manage-create' && 'Add requirement'}
        {(mode === 'manage-edit' || mode === 'guest-edit') && 'Edit item'}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {formError ? <Alert color="error">{formError}</Alert> : null}
          <TextField
            error={Boolean(fieldErrors.name)}
            helperText={fieldErrors.name}
            label="Item name"
            onChange={(event) => setName(event.target.value)}
            value={name}
          />
          <TextField
            error={Boolean(fieldErrors.description)}
            helperText={fieldErrors.description}
            label="Description"
            multiline
            minRows={2}
            onChange={(event) => setDescription(event.target.value)}
            value={description}
          />
          <FormControl fullWidth>
            <InputLabel>Category</InputLabel>
            <Select
              label="Category"
              onChange={(event) => setCategoryId(String(event.target.value) === '' ? null : Number(event.target.value))}
              value={categoryId ?? ''}
            >
              <MenuItem value="">Uncategorised</MenuItem>
              {categories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {category.icon ?? '•'} {category.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {isQuantityFieldVisible ? (
            <TextField
              error={Boolean(quantityValidationMessage ?? fieldErrors.quantityRequired)}
              helperText={quantityValidationMessage ?? fieldErrors.quantityRequired}
              inputProps={{ min: 1, max: 999 }}
              label={mode === 'guest-create' ? 'Quantity' : 'Quantity needed'}
              onChange={(event) => setQuantityInput(event.target.value)}
              type="number"
              value={quantityInput}
            />
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button disabled={isSaving || !name.trim()} onClick={() => void handleSubmit()} variant="contained">
          {isSaving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
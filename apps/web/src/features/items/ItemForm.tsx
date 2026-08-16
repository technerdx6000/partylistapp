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

type ItemFormMode = 'guest-create' | 'manage-create' | 'manage-edit' | 'guest-edit'

type ItemFormProps = {
  categories: readonly EventCategory[]
  identity: EventIdentity | null
  initialCategoryId: number | null
  isOpen: boolean
  item: EventItemWithAssignments | null
  mode: ItemFormMode
  onClose: () => void
  onCreate: (payload: CreateItemRequest) => Promise<void>
  onUpdate: (itemId: number, payload: UpdateItemRequest) => Promise<void>
}

type ItemFormFieldName = 'categoryId' | 'description' | 'name' | 'quantityRequired'

type ItemFormErrors = Partial<Record<ItemFormFieldName, string>>

export function ItemForm({
  categories,
  identity,
  initialCategoryId,
  isOpen,
  item,
  mode,
  onClose,
  onCreate,
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
  const [quantityRequired, setQuantityRequired] = useState(item?.quantityRequired ?? 1)

  useEffect(() => {
    setCategoryId(item?.categoryId ?? initialCategoryId)
    setDescription(item?.description ?? '')
    setFieldErrors({})
    setFormError(null)
    setName(item?.name ?? '')
    setQuantityRequired(item?.quantityRequired ?? 1)
  }, [initialCategoryId, item])

  function setValidationErrors(issues: ReadonlyArray<{ message: string; path: readonly (string | number)[] }>): void {
    const nextFieldErrors: ItemFormErrors = {}

    for (const issue of issues) {
      const fieldName = String(issue.path[0] ?? 'name') as ItemFormFieldName

      nextFieldErrors[fieldName] ??= issue.message
    }

    setFieldErrors(nextFieldErrors)
  }

  async function handleSubmit(): Promise<void> {
    setFieldErrors({})
    setFormError(null)
    setIsSaving(true)

    try {
      if (mode === 'guest-create' || mode === 'manage-create') {
        const parsedPayload = CreateItemRequestSchema.safeParse({
          categoryId,
          createdBy: mode === 'guest-create' ? identity?.participantId ?? null : null,
          description: description.trim() ? description.trim() : null,
          name,
          quantityRequired: mode === 'guest-create' ? null : quantityRequired,
        })

        if (!parsedPayload.success) {
          setValidationErrors(parsedPayload.error.issues)
          return
        }

        await onCreate(parsedPayload.data)
      } else if (item) {
        const parsedPayload = UpdateItemRequestSchema.safeParse({
          categoryId: mode === 'manage-edit' ? categoryId : undefined,
          description: description.trim() ? description.trim() : null,
          name,
          participantId: mode === 'guest-edit' ? identity?.participantId : undefined,
          quantityRequired: mode === 'manage-edit' ? quantityRequired : undefined,
        })

        if (!parsedPayload.success) {
          setValidationErrors(parsedPayload.error.issues)
          return
        }

        await onUpdate(item.id, parsedPayload.data)
      }
    } catch {
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
        {mode === 'manage-edit' && 'Edit item'}
        {mode === 'guest-edit' && 'Edit your contribution'}
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
          {mode !== 'guest-create' && mode !== 'guest-edit' ? (
            <TextField
              error={Boolean(fieldErrors.quantityRequired)}
              helperText={fieldErrors.quantityRequired}
              inputProps={{ min: 1, max: 999 }}
              label="Quantity needed"
              onChange={(event) => setQuantityRequired(Math.max(Number(event.target.value) || 1, 1))}
              type="number"
              value={quantityRequired ?? 1}
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
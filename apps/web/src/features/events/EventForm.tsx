import { CreateEventRequestSchema, type CreateEventRequest } from '@listcollab/shared'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import {
  Alert,
  Button,
  Checkbox,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useState } from 'react'

const STARTER_CATEGORIES = [
  { icon: '🍽️', name: 'Food' },
  { icon: '🥤', name: 'Drinks' },
  { icon: '🧰', name: 'Equipment' },
  { icon: '🎲', name: 'Games' },
  { icon: '✨', name: 'Other' },
] as const

type EventFormProps = {
  isSubmitting: boolean
  onSubmit: (input: CreateEventRequest) => Promise<void>
}

type FieldErrors = Partial<Record<'name' | 'eventDate' | 'location' | 'description' | 'categories', string>>

export function EventForm({ isSubmitting, onSubmit }: EventFormProps): React.JSX.Element {
  const [customCategoryName, setCustomCategoryName] = useState('')
  const [description, setDescription] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [location, setLocation] = useState('')
  const [name, setName] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['Food', 'Drinks'])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setFieldErrors({})
    setFormError(null)

    const categoryNames = [...selectedCategories]
    const trimmedCustomCategory = customCategoryName.trim()

    if (trimmedCustomCategory && !categoryNames.includes(trimmedCustomCategory)) {
      categoryNames.push(trimmedCustomCategory)
    }

    const parsedInput = CreateEventRequestSchema.safeParse({
      name,
      description: description.trim() ? description.trim() : null,
      eventDate: eventDate || null,
      location: location.trim() ? location.trim() : null,
      categories: categoryNames.map((categoryName, index) => {
        const starterCategory = STARTER_CATEGORIES.find((category) => category.name === categoryName)

        return {
          name: categoryName,
          icon: starterCategory?.icon ?? null,
          sortOrder: index,
        }
      }),
    })

    if (!parsedInput.success) {
      const nextFieldErrors: FieldErrors = {}

      for (const issue of parsedInput.error.issues) {
        const fieldName = String(issue.path[0] ?? 'categories') as keyof FieldErrors
        nextFieldErrors[fieldName] ??= issue.message
      }

      setFieldErrors(nextFieldErrors)
      return
    }

    try {
      await onSubmit(parsedInput.data)
    } catch {
      setFormError('We could not create the event. Try again.')
    }
  }

  function toggleCategory(categoryName: string): void {
    setSelectedCategories((currentCategories) =>
      currentCategories.includes(categoryName)
        ? currentCategories.filter((value) => value !== categoryName)
        : [...currentCategories, categoryName]
    )
  }

  return (
    <Stack component="form" noValidate onSubmit={(event) => { void handleSubmit(event) }} spacing={3}>
      <Typography variant="h3">Event details</Typography>

      {formError ? <Alert color="error">{formError}</Alert> : null}

      <TextField
        error={Boolean(fieldErrors.name)}
        helperText={fieldErrors.name}
        label="Event name"
        onChange={(event) => setName(event.target.value)}
        required
        value={name}
      />

      <TextField
        error={Boolean(fieldErrors.eventDate)}
        helperText={fieldErrors.eventDate}
        label="Date"
        onChange={(event) => setEventDate(event.target.value)}
        slotProps={{ inputLabel: { shrink: true } }}
        type="date"
        value={eventDate}
      />

      <TextField
        error={Boolean(fieldErrors.location)}
        helperText={fieldErrors.location}
        label="Location"
        onChange={(event) => setLocation(event.target.value)}
        value={location}
      />

      <TextField
        error={Boolean(fieldErrors.description)}
        helperText={fieldErrors.description}
        label="Description"
        multiline
        minRows={3}
        onChange={(event) => setDescription(event.target.value)}
        value={description}
      />

      <Stack spacing={1.5}>
        <Typography variant="h3">Starter categories</Typography>
        <Stack spacing={1}>
          {STARTER_CATEGORIES.map((category) => (
            <FormControlLabel
              control={
                <Checkbox
                  checked={selectedCategories.includes(category.name)}
                  onChange={() => toggleCategory(category.name)}
                />
              }
              key={category.name}
              label={`${category.icon} ${category.name}`}
            />
          ))}
        </Stack>
        <TextField
          error={Boolean(fieldErrors.categories)}
          helperText={fieldErrors.categories ?? 'Optional custom category'}
          label="Add a custom category"
          onChange={(event) => setCustomCategoryName(event.target.value)}
          value={customCategoryName}
        />
      </Stack>

      <Button disabled={isSubmitting} startIcon={<AddRoundedIcon />} type="submit" variant="contained">
        {isSubmitting ? 'Creating event...' : 'Create event'}
      </Button>
    </Stack>
  )
}
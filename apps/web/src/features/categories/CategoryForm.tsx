import type { EventCategory } from '@listcollab/shared'
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
import { useEffect, useMemo, useState } from 'react'

import {
    CATEGORY_ICON_OPTIONS,
    DEFAULT_CATEGORY_ICON,
    getCategoryIconOption,
    isKnownCategoryIcon,
    normalizeCategoryIconValue,
    renderCategoryIconOption,
    type CategoryIconOption,
} from './categoryIcons'
import { ApiClientError } from '../../services/apiClient'

type CategoryFormProps = {
    category: EventCategory | null
    isOpen: boolean
    onClose: () => void
    onSave: (input: { icon: string; name: string }) => Promise<void>
}

function buildIconOptions(category: EventCategory | null): readonly CategoryIconOption[] {
    if (!category?.icon || isKnownCategoryIcon(category.icon)) {
        return CATEGORY_ICON_OPTIONS
    }

    return [
        {
            Icon: getCategoryIconOption(DEFAULT_CATEGORY_ICON)!.Icon,
            label: `Current icon (${category.icon})`,
            value: category.icon,
        },
        ...CATEGORY_ICON_OPTIONS,
    ]
}

/**
 * Collects a category name and fixed icon selection for organiser category edits.
 *
 * @param {CategoryFormProps} props - Dialog state and save handlers.
 * @returns {React.JSX.Element} The rendered category form dialog.
 */
export function CategoryForm({
    category,
    isOpen,
    onClose,
    onSave,
}: CategoryFormProps): React.JSX.Element {
    const theme = useTheme()
    const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'))
    const iconOptions = useMemo(() => buildIconOptions(category), [category])
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [icon, setIcon] = useState(normalizeCategoryIconValue(category?.icon) ?? DEFAULT_CATEGORY_ICON)
    const [isSaving, setIsSaving] = useState(false)
    const [name, setName] = useState(category?.name ?? '')

    useEffect(() => {
        setErrorMessage(null)
        setIcon(normalizeCategoryIconValue(category?.icon) ?? DEFAULT_CATEGORY_ICON)
        setName(category?.name ?? '')
    }, [category])

    async function handleSave(): Promise<void> {
        const trimmedName = name.trim()

        if (!trimmedName) {
            return
        }

        setErrorMessage(null)
        setIsSaving(true)

        try {
            await onSave({ icon, name: trimmedName })
        } catch (caughtError) {
            if (caughtError instanceof ApiClientError && caughtError.code === 'CATEGORY_ALREADY_EXISTS') {
                setErrorMessage('That category name is already in use for this event.')
                return
            }

            setErrorMessage('We could not save that category. Try again.')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <Dialog fullScreen={isSmallScreen} fullWidth maxWidth="xs" onClose={onClose} open={isOpen}>
            <DialogTitle>{category ? 'Edit category' : 'Add category'}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ pt: 1 }}>
                    {errorMessage ? <Alert color="error">{errorMessage}</Alert> : null}
                    <TextField label="Category name" onChange={(event) => setName(event.target.value)} value={name} />
                    <FormControl fullWidth>
                        <InputLabel>Icon</InputLabel>
                        <Select label="Icon" onChange={(event) => setIcon(String(event.target.value))} value={icon}>
                            {iconOptions.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                    {renderCategoryIconOption(option)}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button disabled={isSaving || !name.trim()} onClick={() => void handleSave()} variant="contained">
                    {isSaving ? 'Saving…' : 'Save'}
                </Button>
            </DialogActions>
        </Dialog>
    )
}
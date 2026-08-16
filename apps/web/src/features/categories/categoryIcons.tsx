import ChecklistRoundedIcon from '@mui/icons-material/ChecklistRounded'
import FolderRoundedIcon from '@mui/icons-material/FolderRounded'
import LocalDrinkRoundedIcon from '@mui/icons-material/LocalDrinkRounded'
import ParkRoundedIcon from '@mui/icons-material/ParkRounded'
import RestaurantRoundedIcon from '@mui/icons-material/RestaurantRounded'
import SportsEsportsRoundedIcon from '@mui/icons-material/SportsEsportsRounded'
import type { SvgIconProps } from '@mui/material'
import { Stack, Typography } from '@mui/material'
import type { ComponentType } from 'react'

export const DEFAULT_CATEGORY_ICON = 'other'

const LEGACY_CATEGORY_ICON_ALIASES: Readonly<Record<string, string>> = {
    '🍽️': 'food',
    '🥤': 'drinks',
}

export type CategoryIconOption = {
    readonly Icon: ComponentType<SvgIconProps>
    readonly label: string
    readonly value: string
}

export const CATEGORY_ICON_OPTIONS: readonly CategoryIconOption[] = [
    { Icon: RestaurantRoundedIcon, label: 'Food', value: 'food' },
    { Icon: LocalDrinkRoundedIcon, label: 'Drinks', value: 'drinks' },
    { Icon: ChecklistRoundedIcon, label: 'Supplies', value: 'supplies' },
    { Icon: SportsEsportsRoundedIcon, label: 'Games', value: 'games' },
    { Icon: ParkRoundedIcon, label: 'Outdoors', value: 'outdoors' },
    { Icon: FolderRoundedIcon, label: 'Other', value: DEFAULT_CATEGORY_ICON },
] as const

/**
 * Normalises legacy stored icon values into the fixed category icon key set when possible.
 *
 * @param {string | null | undefined} value - The stored category icon value.
 * @returns {string | null | undefined} The normalised icon key when one is known.
 */
export function normalizeCategoryIconValue(value: string | null | undefined): string | null | undefined {
    return value ? LEGACY_CATEGORY_ICON_ALIASES[value] ?? value : value
}

/**
 * Looks up a fixed category icon option by its stored string value.
 *
 * @param {string | null | undefined} value - The stored category icon value.
 * @returns {CategoryIconOption | undefined} The matching fixed icon option, if one exists.
 */
export function getCategoryIconOption(value: string | null | undefined): CategoryIconOption | undefined {
    const normalizedValue = normalizeCategoryIconValue(value)

    return CATEGORY_ICON_OPTIONS.find((option) => option.value === normalizedValue)
}

/**
 * Returns whether a stored category icon value belongs to the fixed icon set.
 *
 * @param {string | null | undefined} value - The stored category icon value.
 * @returns {boolean} True when the value belongs to the fixed icon set.
 */
export function isKnownCategoryIcon(value: string | null | undefined): boolean {
    return Boolean(getCategoryIconOption(value))
}

/**
 * Renders the stored category icon using the fixed icon set when possible.
 *
 * Falls back to plain text for legacy emoji/string icons already stored in data.
 *
 * @param {string | null | undefined} value - The stored category icon value.
 * @returns {React.JSX.Element} The rendered icon node.
 */
export function renderCategoryIcon(value: string | null | undefined): React.JSX.Element {
    const option = getCategoryIconOption(value)

    if (option) {
        const Icon = option.Icon

        return <Icon fontSize="small" />
    }

    return <Typography component="span">{value?.trim() || '•'}</Typography>
}

/**
 * Renders a compact icon-and-label row for a category icon option.
 *
 * @param {CategoryIconOption} option - The fixed icon option to render.
 * @returns {React.JSX.Element} The option display node.
 */
export function renderCategoryIconOption(option: CategoryIconOption): React.JSX.Element {
    const Icon = option.Icon

    return (
        <Stack component="span" direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Icon fontSize="small" />
            <Typography component="span">{option.label}</Typography>
        </Stack>
    )
}
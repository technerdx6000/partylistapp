import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { CategoryForm } from './CategoryForm'
import { renderWithProviders } from '../../../test/renderWithProviders'

describe('CategoryForm', () => {
    it('saves a trimmed category name with the selected fixed icon', async () => {
        const onSave = vi.fn().mockResolvedValue(undefined)

        renderWithProviders(
            <CategoryForm category={null} isOpen onClose={() => undefined} onSave={onSave} />
        )

        fireEvent.change(screen.getByLabelText('Category name'), { target: { value: '  Dessert  ' } })
        fireEvent.mouseDown(screen.getByRole('combobox'))
        fireEvent.click(await screen.findByRole('option', { name: 'Drinks' }))
        fireEvent.click(screen.getByRole('button', { name: 'Save' }))

        await waitFor(() => {
            expect(onSave).toHaveBeenCalledWith({ icon: 'drinks', name: 'Dessert' })
        })
    })

    it('normalizes a known legacy icon value when editing an older category', async () => {
        const onSave = vi.fn().mockResolvedValue(undefined)

        renderWithProviders(
            <CategoryForm
                category={{
                    id: 2,
                    eventId: 1,
                    name: 'Food',
                    icon: '🍽️',
                    sortOrder: 0,
                    createdAt: '2026-08-15T00:00:00.000Z',
                }}
                isOpen
                onClose={() => undefined}
                onSave={onSave}
            />
        )

        fireEvent.change(screen.getByLabelText('Category name'), { target: { value: 'Meals' } })
        fireEvent.click(screen.getByRole('button', { name: 'Save' }))

        await waitFor(() => {
            expect(onSave).toHaveBeenCalledWith({ icon: 'food', name: 'Meals' })
        })
    })
})
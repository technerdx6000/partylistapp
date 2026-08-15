import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import NotFoundPage from './NotFoundPage'
import { renderWithProviders } from '../../../test/renderWithProviders'

describe('NotFoundPage', () => {
  it('renders the not found call to action', () => {
    renderWithProviders(<NotFoundPage />)

    expect(screen.getByRole('heading', { name: 'This page is not available.' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go home' })).toHaveAttribute('href', '/')
  })
})
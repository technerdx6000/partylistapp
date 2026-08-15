import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import LandingPage from './LandingPage'
import { renderWithProviders } from '../../../test/renderWithProviders'

describe('LandingPage', () => {
  afterEach(() => {
    window.localStorage.clear()
  })

  it('renders the empty visited-events state', () => {
    renderWithProviders(<LandingPage />)

    expect(screen.getByText('This browser has not opened any event links yet.')).toBeInTheDocument()
  })

  it('renders visited events from localStorage', () => {
    window.localStorage.setItem(
      'listcollab:visited-events',
      JSON.stringify([
        {
          shareToken: 'abcdefghij',
          name: 'BBQ Night',
          lastVisitedAt: '2026-08-15T12:00:00.000Z',
        },
      ])
    )

    renderWithProviders(<LandingPage />)

    expect(screen.getByRole('link', { name: 'BBQ Night' })).toBeInTheDocument()
    expect(screen.getByText(/Last opened/)).toBeInTheDocument()
  })
})
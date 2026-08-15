import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import ManageEventPage from './ManageEventPage'
import { renderWithProviders } from '../../../test/renderWithProviders'

describe('ManageEventPage', () => {
  it('renders the event page in organiser mode for a share token route', () => {
    window.history.replaceState(null, document.title, '/e/abcdefghij/manage#k=' + 'a'.repeat(64))

    renderWithProviders(
      <Routes>
        <Route path="/e/:shareToken/manage" element={<ManageEventPage />} />
      </Routes>,
      { route: '/e/abcdefghij/manage' }
    )

    expect(screen.getByText(/Loading event details/)).toBeInTheDocument()
  })

  it('falls back to the invalid-page screen when the route has no share token param', () => {
    renderWithProviders(
      <Routes>
        <Route path="/" element={<ManageEventPage />} />
      </Routes>,
      { route: '/' }
    )

    expect(screen.getByRole('heading', { name: 'This page is not available.' })).toBeInTheDocument()
  })
})
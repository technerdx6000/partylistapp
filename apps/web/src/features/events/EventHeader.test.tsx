import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { EventHeader } from './EventHeader'
import { renderWithProviders } from '../../../test/renderWithProviders'

describe('EventHeader', () => {
  it('renders event details, coverage summary, and organiser link details', () => {
    renderWithProviders(
      <EventHeader
        adminLink="https://example.com/e/share/manage#k=abc"
        coverageSummary={{ claimed: 6, required: 8, remaining: 2, status: 'open' }}
        event={{
          id: 1,
          name: 'Camp Weekend',
          description: 'Bring the essentials',
          eventDate: '2026-08-20',
          location: 'Lakeside',
          shareToken: 'abcdefghij',
          createdAt: '2026-08-15T00:00:00.000Z',
          updatedAt: '2026-08-15T00:00:00.000Z',
        }}
        isManageMode
        participantsCount={12}
      />
    )

    expect(screen.getByRole('heading', { name: 'Camp Weekend' })).toBeInTheDocument()
    expect(screen.getByText('12 people')).toBeInTheDocument()
    expect(screen.getByText('6 / 8 items covered')).toBeInTheDocument()
    expect(screen.getByDisplayValue('https://example.com/e/share/manage#k=abc')).toBeInTheDocument()
  })

  it('renders compact summary without optional event metadata when those fields are absent', () => {
    renderWithProviders(
      <EventHeader
        adminLink={null}
        coverageSummary={{ claimed: 1, required: null, remaining: null, status: 'completed' }}
        event={{
          id: 1,
          name: 'Contribution Only',
          description: null,
          eventDate: null,
          location: null,
          shareToken: 'abcdefghij',
          createdAt: '2026-08-15T00:00:00.000Z',
          updatedAt: '2026-08-15T00:00:00.000Z',
        }}
        isManageMode={false}
        participantsCount={1}
      />
    )

    expect(screen.getByText('1 claimed')).toBeInTheDocument()
    expect(screen.queryByLabelText('Organiser link')).not.toBeInTheDocument()
    expect(screen.queryByText('Organiser mode')).not.toBeInTheDocument()
  })

  it('renders a condensed summary on scroll without the organiser link or extended metadata', () => {
    renderWithProviders(
      <EventHeader
        adminLink="https://example.com/e/share/manage#k=abc"
        coverageSummary={{ claimed: 6, required: 8, remaining: 2, status: 'open' }}
        event={{
          id: 1,
          name: 'Camp Weekend',
          description: 'Bring the essentials',
          eventDate: '2026-08-20',
          location: 'Lakeside',
          shareToken: 'abcdefghij',
          createdAt: '2026-08-15T00:00:00.000Z',
          updatedAt: '2026-08-15T00:00:00.000Z',
        }}
        isCondensed
        isManageMode
        participantsCount={12}
      />
    )

    expect(screen.getByRole('heading', { name: 'Camp Weekend' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Organiser link')).not.toBeInTheDocument()
    expect(screen.queryByText('Bring the essentials')).not.toBeInTheDocument()
    expect(screen.queryByText('Share token: abcdefghij')).not.toBeInTheDocument()
    expect(screen.getByText('Lakeside')).toBeInTheDocument()
  })
})
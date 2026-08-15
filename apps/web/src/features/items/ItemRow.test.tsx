import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ItemRow } from './ItemRow'
import { renderWithProviders } from '../../../test/renderWithProviders'

describe('ItemRow', () => {
  it('renders contribution rows and keeps attacker-controlled text inert', () => {
    const maliciousName = '<img src=x onerror=alert(1)>'
    const { container } = renderWithProviders(
      <ItemRow
        currentIdentity={null}
        isManageMode={false}
        item={{
          id: 5,
          eventId: 1,
          categoryId: null,
          name: maliciousName,
          description: 'Portable speaker',
          quantityRequired: null,
          status: 'open',
          createdBy: 9,
          createdAt: '2026-08-15T00:00:00.000Z',
          updatedAt: '2026-08-15T00:00:00.000Z',
          assignments: [],
          coverage: { claimed: 0, required: null, remaining: null, status: 'open' },
        }}
        participants={[
          {
            id: 9,
            eventId: 1,
            name: 'Aaron',
            createdAt: '2026-08-15T00:00:00.000Z',
          },
        ]}
        onClaim={() => undefined}
      />
    )

    expect(screen.getByText(maliciousName)).toBeInTheDocument()
    expect(screen.getByText('Aaron added this contribution.')).toBeInTheDocument()
    expect(container.querySelector('img[src="x"]')).toBeNull()
    expect(container.querySelector('script')).toBeNull()
  })

  it('renders assignment summaries for required items and claimed contributions', () => {
    renderWithProviders(
      <>
        <ItemRow
          currentIdentity={null}
          isManageMode={false}
          item={{
            id: 6,
            eventId: 1,
            categoryId: 2,
            name: 'Paper plates',
            description: null,
            quantityRequired: 3,
            status: 'open',
            createdBy: null,
            createdAt: '2026-08-15T00:00:00.000Z',
            updatedAt: '2026-08-15T00:00:00.000Z',
            assignments: [{ id: 1, itemId: 6, participantId: 2, quantity: 2, note: null, createdAt: '2026-08-15T00:00:00.000Z' }],
            coverage: { claimed: 2, required: 3, remaining: 1, status: 'open' },
          }}
          participants={[
            {
              id: 2,
              eventId: 1,
              name: 'Jordan',
              createdAt: '2026-08-15T00:00:00.000Z',
            },
          ]}
          onClaim={() => undefined}
        />
        <ItemRow
          currentIdentity={null}
          isManageMode={false}
          item={{
            id: 7,
            eventId: 1,
            categoryId: null,
            name: 'Portable speaker',
            description: null,
            quantityRequired: null,
            status: 'open',
            createdBy: 2,
            createdAt: '2026-08-15T00:00:00.000Z',
            updatedAt: '2026-08-15T00:00:00.000Z',
            assignments: [{ id: 2, itemId: 7, participantId: 2, quantity: 1, note: null, createdAt: '2026-08-15T00:00:00.000Z' }],
            coverage: { claimed: 1, required: null, remaining: null, status: 'completed' },
          }}
          participants={[
            {
              id: 2,
              eventId: 1,
              name: 'Jordan',
              createdAt: '2026-08-15T00:00:00.000Z',
            },
          ]}
          onClaim={() => undefined}
        />
      </>
    )

    expect(screen.getAllByText('Jordan ×2')).toHaveLength(2)
    expect(screen.getByText('Jordan ×1 is bringing this contribution.')).toBeInTheDocument()
    expect(screen.getByText('Contribution ready')).toBeInTheDocument()
    expect(screen.getByText('1 still needed')).toBeInTheDocument()
  })

  it('only exposes other people\'s claim chips as display-only in guest mode', () => {
    const onClaim = vi.fn()

    renderWithProviders(
      <ItemRow
        currentIdentity={{ displayName: 'Jordan', participantId: 2 }}
        isManageMode={false}
        item={{
          id: 6,
          eventId: 1,
          categoryId: 2,
          name: 'Paper plates',
          description: null,
          quantityRequired: 3,
          status: 'open',
          createdBy: null,
          createdAt: '2026-08-15T00:00:00.000Z',
          updatedAt: '2026-08-15T00:00:00.000Z',
          assignments: [
            { id: 1, itemId: 6, participantId: 1, quantity: 1, note: null, createdAt: '2026-08-15T00:00:00.000Z' },
            { id: 2, itemId: 6, participantId: 2, quantity: 1, note: null, createdAt: '2026-08-15T00:00:00.000Z' },
          ],
          coverage: { claimed: 2, required: 3, remaining: 1, status: 'open' },
        }}
        participants={[
          { id: 1, eventId: 1, name: 'Taylor', createdAt: '2026-08-15T00:00:00.000Z' },
          { id: 2, eventId: 1, name: 'Jordan', createdAt: '2026-08-15T00:00:00.000Z' },
        ]}
        onClaim={onClaim}
      />
    )

    expect(screen.queryByRole('button', { name: 'Taylor ×1' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Jordan ×1' }))

    expect(onClaim).toHaveBeenCalledWith(
      expect.objectContaining({ id: 6, name: 'Paper plates' }),
      expect.objectContaining({ id: 2, participantId: 2 })
    )
  })
})
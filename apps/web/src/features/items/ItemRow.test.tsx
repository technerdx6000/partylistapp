import { fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ItemRow } from './ItemRow'
import { renderWithProviders } from '../../../test/renderWithProviders'

function setMatchMedia(matches: boolean): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches,
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    }))
  )
}

describe('ItemRow', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders a compact contribution row, keeps attacker-controlled text inert, and opens details from the row click target', () => {
    const maliciousName = '<img src=x onerror=alert(1)>'
    const onOpenDetail = vi.fn()
    const { container } = renderWithProviders(
      <ItemRow
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
        onClaim={() => undefined}
        onDeleteItem={() => undefined}
        onEditItem={() => undefined}
        onOpenDetail={onOpenDetail}
      />
    )

    expect(screen.getByText(maliciousName)).toBeInTheDocument()
    expect(screen.getByText('Open contribution')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: `Claim ${maliciousName}` })).toBeInTheDocument()
    expect(container.querySelector('img[src="x"]')).toBeNull()
    expect(container.querySelector('script')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: `Open ${maliciousName} details` }))

    expect(onOpenDetail).toHaveBeenCalledWith(expect.objectContaining({ id: 5, name: maliciousName }))
  })

  it('renders the minimal organiser row inline order as title, edit, claim, delete, then status', () => {
    renderWithProviders(
      <ItemRow
        item={{
          id: 6,
          eventId: 1,
          categoryId: 2,
          name: 'Paper plates',
          description: 'Disposable plates',
          quantityRequired: 3,
          status: 'open',
          createdBy: null,
          createdAt: '2026-08-15T00:00:00.000Z',
          updatedAt: '2026-08-15T00:00:00.000Z',
          assignments: [{ id: 1, itemId: 6, participantId: 2, quantity: 2, note: null, createdAt: '2026-08-15T00:00:00.000Z' }],
          coverage: { claimed: 2, required: 3, remaining: 1, status: 'open' },
        }}
        onClaim={() => undefined}
        onDeleteItem={() => undefined}
        onEditItem={() => undefined}
        onOpenDetail={() => undefined}
      />
    )

    const rowTrigger = screen.getByRole('button', { name: 'Open Paper plates details' })
    const title = screen.getByText('Paper plates')
    const edit = screen.getByLabelText('Edit Paper plates')
    const claim = screen.getByRole('button', { name: 'Claim Paper plates' })
    const deleteButton = screen.getByLabelText('Delete Paper plates')
    const status = screen.getByText('Open · 1 left')

    expect(screen.queryByText('Disposable plates')).not.toBeInTheDocument()
    expect(rowTrigger.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_CONTAINED_BY).toBeTruthy()
    expect(title.compareDocumentPosition(edit) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(edit.compareDocumentPosition(claim) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(claim.compareDocumentPosition(deleteButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(deleteButton.compareDocumentPosition(status) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('routes inline actions without triggering the row detail click target', () => {
    const onClaim = vi.fn()
    const onDeleteItem = vi.fn()
    const onEditItem = vi.fn()
    const onOpenDetail = vi.fn()

    renderWithProviders(
      <ItemRow
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
        onClaim={onClaim}
        onDeleteItem={onDeleteItem}
        onEditItem={onEditItem}
        onOpenDetail={onOpenDetail}
      />
    )

    fireEvent.click(screen.getByLabelText('Edit Paper plates'))
    fireEvent.click(screen.getByRole('button', { name: 'Claim Paper plates' }))
    fireEvent.click(screen.getByLabelText('Delete Paper plates'))

    expect(onEditItem).toHaveBeenCalledWith(expect.objectContaining({ id: 6, name: 'Paper plates' }))
    expect(onClaim).toHaveBeenCalledWith(expect.objectContaining({ id: 6, name: 'Paper plates' }))
    expect(onDeleteItem).toHaveBeenCalledWith(expect.objectContaining({ id: 6, name: 'Paper plates' }))
    expect(onOpenDetail).not.toHaveBeenCalled()
  })

  it('opens details from the compact row in guest mode and keeps edit, claim, delete, and status inline', () => {
    const onOpenDetail = vi.fn()

    renderWithProviders(
      <ItemRow
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
        onClaim={() => undefined}
        onDeleteItem={() => undefined}
        onEditItem={() => undefined}
        onOpenDetail={onOpenDetail}
      />
    )

    expect(screen.getByLabelText('Edit Portable speaker')).toBeInTheDocument()
    expect(screen.getByLabelText('Delete Portable speaker')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Claim Portable speaker' })).toBeInTheDocument()
    expect(screen.getByText('Closed')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Open Portable speaker details' }))

    expect(onOpenDetail).toHaveBeenCalledWith(expect.objectContaining({ id: 7, name: 'Portable speaker' }))
  })

  it('keeps edit, claim, delete, and status visible on mobile organiser rows', () => {
    setMatchMedia(true)

    renderWithProviders(
      <ItemRow
        item={{
          id: 14,
          eventId: 1,
          categoryId: 2,
          name: 'Camp chairs',
          description: null,
          quantityRequired: 4,
          status: 'open',
          createdBy: null,
          createdAt: '2026-08-15T00:00:00.000Z',
          updatedAt: '2026-08-15T00:00:00.000Z',
          assignments: [],
          coverage: { claimed: 0, required: 4, remaining: 4, status: 'open' },
        }}
        onClaim={() => undefined}
        onDeleteItem={() => undefined}
        onEditItem={() => undefined}
        onOpenDetail={() => undefined}
      />
    )

    expect(screen.getByRole('button', { name: 'Open Camp chairs details' })).toBeInTheDocument()
    expect(screen.getByLabelText('Edit Camp chairs')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Claim Camp chairs' })).toBeInTheDocument()
    expect(screen.getByLabelText('Delete Camp chairs')).toBeInTheDocument()
    expect(screen.getByText('Open · 4 left')).toBeInTheDocument()
  })
})
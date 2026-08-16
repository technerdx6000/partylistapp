import { fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ItemDetailSurface } from './ItemDetailSurface'
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

function buildItem(overrides: Partial<Parameters<typeof ItemDetailSurface>[0]['item']> = {}) {
  return {
    assignments: [{ createdAt: '2026-08-15T00:00:00.000Z', id: 1, itemId: 1, note: null, participantId: 1, quantity: 2 }],
    categoryId: 1,
    coverage: { claimed: 2, remaining: 2, required: 4, status: 'open' as const },
    createdAt: '2026-08-15T00:00:00.000Z',
    createdBy: 1,
    description: 'Bring the essentials',
    eventId: 1,
    id: 1,
    name: 'Bread Rolls',
    quantityRequired: 4,
    status: 'open' as const,
    updatedAt: '2026-08-15T00:00:00.000Z',
    ...overrides,
  }
}

describe('ItemDetailSurface', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders nothing when no item is selected', () => {
    const { container } = renderWithProviders(
      <ItemDetailSurface
        currentIdentity={null}
        isManageMode={false}
        isOpen={false}
        item={null}
        mode="view"
        onClose={() => undefined}
        onDelete={() => undefined}
        onEdit={() => undefined}
        onOpenClaim={() => undefined}
        participants={[]}
      />
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('renders the desktop flyout detail surface and routes the edit, claim, and delete actions', () => {
    const onClose = vi.fn()
    const onDelete = vi.fn()
    const onEdit = vi.fn()
    const onOpenClaim = vi.fn()
    const item = buildItem()

    renderWithProviders(
      <ItemDetailSurface
        currentIdentity={{ displayName: 'Taylor', participantId: 1 }}
        isManageMode
        isOpen
        item={item}
        mode="edit"
        onClose={onClose}
        onDelete={onDelete}
        onEdit={onEdit}
        onOpenClaim={onOpenClaim}
        participants={[{ createdAt: '2026-08-15T00:00:00.000Z', eventId: 1, id: 1, name: 'Taylor' }]}
      />
    )

    expect(screen.getByText('Edit this item from here.')).toBeInTheDocument()
    expect(screen.getByText('Bring the essentials')).toBeInTheDocument()
    expect(screen.getByText('Assignments')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Claim item' }))
    fireEvent.click(screen.getByRole('button', { name: 'Edit item' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete item' }))
    fireEvent.click(screen.getByRole('button', { name: 'Taylor ×2' }))
    fireEvent.click(screen.getByRole('button', { name: 'Close item details' }))

    expect(onOpenClaim).toHaveBeenCalledTimes(2)
    expect(onOpenClaim).toHaveBeenNthCalledWith(1, expect.objectContaining({ id: 1, name: 'Bread Rolls' }))
    expect(onOpenClaim).toHaveBeenNthCalledWith(2, expect.objectContaining({ id: 1, name: 'Bread Rolls' }), expect.objectContaining({ id: 1, participantId: 1 }))
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 1, name: 'Bread Rolls' }))
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 1, name: 'Bread Rolls' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders the guest view without organiser actions and without interactive assignment chips', () => {
    renderWithProviders(
      <ItemDetailSurface
        currentIdentity={null}
        isManageMode={false}
        isOpen
        item={buildItem({ description: null })}
        mode="view"
        onClose={() => undefined}
        onDelete={() => undefined}
        onEdit={() => undefined}
        onOpenClaim={() => undefined}
        participants={[{ createdAt: '2026-08-15T00:00:00.000Z', eventId: 1, id: 1, name: 'Taylor' }]}
      />
    )

    expect(screen.queryByText('Edit this item from here.')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit item' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete item' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Taylor ×2' })).not.toBeInTheDocument()
  })

  it('renders contribution details without a progress bar and shows the delete-focused hint', () => {
    renderWithProviders(
      <ItemDetailSurface
        currentIdentity={null}
        isManageMode
        isOpen
        item={buildItem({ assignments: [], coverage: { claimed: 0, remaining: null, required: null, status: 'open' }, createdBy: 2, description: null, name: 'Portable speaker', quantityRequired: null })}
        mode="delete"
        onClose={() => undefined}
        onDelete={() => undefined}
        onEdit={() => undefined}
        onOpenClaim={() => undefined}
        participants={[{ createdAt: '2026-08-15T00:00:00.000Z', eventId: 1, id: 2, name: 'Jordan' }]}
      />
    )

    expect(screen.getByText('Delete this item from here.')).toBeInTheDocument()
    expect(screen.getByText('Jordan added this contribution.')).toBeInTheDocument()
    expect(screen.queryByRole('progressbar', { name: 'Portable speaker coverage progress' })).not.toBeInTheDocument()
    expect(screen.queryByText('Assignments')).not.toBeInTheDocument()
  })

  it('keeps edit and delete visible in the mobile detail view for organisers', () => {
    setMatchMedia(true)

    renderWithProviders(
      <ItemDetailSurface
        currentIdentity={{ displayName: 'Taylor', participantId: 1 }}
        isManageMode
        isOpen
        item={buildItem()}
        mode="view"
        onClose={() => undefined}
        onDelete={() => undefined}
        onEdit={() => undefined}
        onOpenClaim={() => undefined}
        participants={[{ createdAt: '2026-08-15T00:00:00.000Z', eventId: 1, id: 1, name: 'Taylor' }]}
      />
    )

    expect(screen.getByRole('button', { name: 'Claim item' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit item' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete item' })).toBeInTheDocument()
  })
})
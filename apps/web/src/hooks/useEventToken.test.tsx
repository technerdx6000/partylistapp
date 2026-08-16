import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { useAdminTokenFromFragment, useEventToken, useStoredAdminToken } from './useEventToken'
import { renderWithProviders } from '../../test/renderWithProviders'
import { EventTokenProvider } from '../app/EventTokenContext'

function TokenProbe(): React.JSX.Element {
  useAdminTokenFromFragment('abcdefghij')
  const adminToken = useStoredAdminToken('abcdefghij')
  const shareToken = useEventToken('abcdefghij', false)
  const preferredToken = useEventToken('abcdefghij', true)

  return (
    <div>
      <span data-testid="admin-token">{adminToken ?? 'none'}</span>
      <span data-testid="share-token">{shareToken}</span>
      <span data-testid="preferred-token">{preferredToken}</span>
    </div>
  )
}

describe('useEventToken hooks', () => {
  afterEach(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
    window.history.replaceState(null, document.title, '/')
  })

  it('stores the admin token for the session, strips the fragment, and never writes it to localStorage', () => {
    window.history.replaceState(null, document.title, '/e/abcdefghij/manage#k=' + 'a'.repeat(64))

    renderWithProviders(
      <EventTokenProvider>
        <TokenProbe />
      </EventTokenProvider>
    )

    expect(screen.getByTestId('admin-token')).toHaveTextContent('a'.repeat(64))
    expect(screen.getByTestId('share-token')).toHaveTextContent('abcdefghij')
    expect(screen.getByTestId('preferred-token')).toHaveTextContent('a'.repeat(64))
    expect(window.location.hash).toBe('')
    expect(window.localStorage.length).toBe(0)
    expect(window.sessionStorage.getItem('listcollab:admin-token:abcdefghij')).toBe('a'.repeat(64))
  })

  it('restores the admin token from sessionStorage on a fresh provider mount', () => {
    window.sessionStorage.setItem('listcollab:admin-token:abcdefghij', 'b'.repeat(64))

    renderWithProviders(
      <EventTokenProvider>
        <TokenProbe />
      </EventTokenProvider>
    )

    expect(screen.getByTestId('admin-token')).toHaveTextContent('b'.repeat(64))
    expect(screen.getByTestId('preferred-token')).toHaveTextContent('b'.repeat(64))
  })
})
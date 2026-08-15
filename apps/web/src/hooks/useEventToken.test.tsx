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
    window.history.replaceState(null, document.title, '/')
  })

  it('stores the admin token in memory, strips the fragment, and never writes it to localStorage', () => {
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
  })
})
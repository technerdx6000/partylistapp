import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { useEventIdentity } from './useEventIdentity'

describe('useEventIdentity', () => {
  afterEach(() => {
    window.localStorage.clear()
  })

  it('stores identities per event and clears only the active event identity', async () => {
    window.localStorage.setItem(
      'listcollab:identity:other-event',
      JSON.stringify({ displayName: 'Taylor', participantId: 9 })
    )

    const { result, rerender } = renderHook(({ shareToken }) => useEventIdentity(shareToken), {
      initialProps: { shareToken: 'camp-weekend' },
    })

    await waitFor(() => {
      expect(result.current.identity).toBeNull()
    })

    act(() => {
      result.current.setIdentity({ displayName: 'Jordan', participantId: 2 })
    })

    expect(window.localStorage.getItem('listcollab:identity:camp-weekend')).toBe(
      JSON.stringify({ displayName: 'Jordan', participantId: 2 })
    )

    rerender({ shareToken: 'other-event' })

    await waitFor(() => {
      expect(result.current.identity).toEqual({ displayName: 'Taylor', participantId: 9 })
    })

    act(() => {
      result.current.clearIdentity()
    })

    expect(window.localStorage.getItem('listcollab:identity:other-event')).toBeNull()
    expect(window.localStorage.getItem('listcollab:identity:camp-weekend')).toBe(
      JSON.stringify({ displayName: 'Jordan', participantId: 2 })
    )
  })

  it('ignores malformed stored identities', async () => {
    window.localStorage.setItem('listcollab:identity:camp-weekend', '{bad-json')

    const { result } = renderHook(() => useEventIdentity('camp-weekend'))

    await waitFor(() => {
      expect(result.current.identity).toBeNull()
    })
  })
})
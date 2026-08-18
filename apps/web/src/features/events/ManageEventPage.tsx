import { useParams } from 'react-router-dom'

import EventPage from './EventPage'
import NotFoundPage from './NotFoundPage'
import { useAdminTokenFromFragment, useStoredAdminToken } from '../../hooks/useEventToken'

/** Renders organiser mode only when a valid organiser token is available for the event. */
export default function ManageEventPage(): React.JSX.Element {
  const { shareToken } = useParams<{ shareToken: string }>()
  const resolvedShareToken = shareToken ?? ''

  useAdminTokenFromFragment(resolvedShareToken)
  const adminToken = useStoredAdminToken(resolvedShareToken)

  if (!shareToken || !adminToken) {
    return <NotFoundPage />
  }

  return <EventPage manageMode />
}
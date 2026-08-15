import { useParams } from 'react-router-dom'

import EventPage from './EventPage'
import NotFoundPage from './NotFoundPage'
import { useAdminTokenFromFragment } from '../../hooks/useEventToken'

export default function ManageEventPage(): React.JSX.Element {
  const { shareToken } = useParams<{ shareToken: string }>()

  useAdminTokenFromFragment(shareToken ?? '')

  if (!shareToken) {
    return <NotFoundPage />
  }

  return <EventPage manageMode />
}
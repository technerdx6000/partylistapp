import { createBrowserRouter } from 'react-router-dom'

import CreateEventPage from '../features/events/CreateEventPage'
import EventPage from '../features/events/EventPage'
import LandingPage from '../features/events/LandingPage'
import ManageEventPage from '../features/events/ManageEventPage'
import NotFoundPage from '../features/events/NotFoundPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/create',
    element: <CreateEventPage />,
  },
  {
    path: '/e/:shareToken',
    element: <EventPage manageMode={false} />,
  },
  {
    path: '/e/:shareToken/manage',
    element: <ManageEventPage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])
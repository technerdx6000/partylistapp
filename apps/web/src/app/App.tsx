import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { RouterProvider } from 'react-router-dom'

import { EventTokenProvider } from './EventTokenContext'
import { router } from './router'
import { theme } from './theme'

export default function App(): React.JSX.Element {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: true,
          },
        },
      })
  )

  useEffect(() => {
    document.documentElement.lang = 'en'
  }, [])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <EventTokenProvider>
          <RouterProvider router={router} />
        </EventTokenProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
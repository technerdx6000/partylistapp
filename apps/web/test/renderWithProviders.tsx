import { CssBaseline } from '@mui/material'
import { ThemeProvider } from '@mui/material/styles'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'

import { EventTokenProvider } from '../src/app/EventTokenContext'
import { theme } from '../src/app/theme'

type RenderWithProvidersOptions = {
  route?: string
}

export function renderWithProviders(
  ui: ReactElement,
  { route = '/' }: RenderWithProvidersOptions = {}
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return render(
    <MemoryRouter initialEntries={[route]}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <QueryClientProvider client={queryClient}>
          <EventTokenProvider>{ui}</EventTokenProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </MemoryRouter>
  )
}
import type { CreateEventRequest } from '@listcollab/shared'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import { Alert, Button, Card, CardContent, Container, Stack, Typography } from '@mui/material'
import { useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'

import { EventForm } from './EventForm'
import { recordVisitedEvent } from './visitedEvents'
import { ApiClientError, createApiClient } from '../../services/apiClient'

export default function CreateEventPage(): React.JSX.Element {
  const apiClient = createApiClient(null)
  const navigate = useNavigate()
  const [error, setError] = useState<ApiClientError | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(input: CreateEventRequest): Promise<void> {
    setError(null)
    setIsSubmitting(true)

    try {
      const response = await apiClient.createEvent(input)
      recordVisitedEvent(response.event)
      void navigate(`/e/${response.event.shareToken}/manage#k=${response.event.adminToken}`)
    } catch (caughtError) {
      if (caughtError instanceof ApiClientError) {
        setError(caughtError)
        return
      }

      setError(new ApiClientError('Something went wrong', 'INTERNAL_ERROR', 'unknown'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Button component={RouterLink} size="large" startIcon={<ArrowBackRoundedIcon />} to="/" variant="text">
          Back to home
        </Button>

        <Card>
          <CardContent>
            <Stack spacing={3}>
              <Stack spacing={1}>
                <Typography variant="h2">Create a new event</Typography>
                <Typography color="text.secondary">
                  Pick the basics now. Guests and claiming come later once the event page is live.
                </Typography>
              </Stack>

              {error ? (
                <Alert color="error">
                  {error.message} Request ID: {error.requestId}
                </Alert>
              ) : null}

              <EventForm isSubmitting={isSubmitting} onSubmit={handleSubmit} />
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Container>
  )
}
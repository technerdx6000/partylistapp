import type { EventItemWithAssignments } from '@listcollab/shared'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { getEventCoverageSummary } from './eventCoverage'
import { EventHeader } from './EventHeader'
import { recordVisitedEvent } from './visitedEvents'
import { useEvent } from '../../hooks/useEvent'
import { useStoredAdminToken } from '../../hooks/useEventToken'
import { ApiClientError } from '../../services/apiClient'
import { ItemList } from '../items/ItemList'

type EventPageProps = {
  manageMode: boolean
}

function isInvalidLinkError(error: ApiClientError): boolean {
  return error.code === 'EVENT_NOT_FOUND' || error.code === 'INVALID_TOKEN'
}

function filterItems(
  items: readonly EventItemWithAssignments[],
  participantNamesById: Map<number, string>,
  searchTerm: string
): readonly EventItemWithAssignments[] {
  if (!searchTerm.trim()) {
    return items
  }

  const normalizedTerm = searchTerm.trim().toLowerCase()

  return items.filter((item) => {
    const participantNames = item.assignments
      .map((assignment) => participantNamesById.get(assignment.participantId) ?? '')
      .join(' ')

    return `${item.name} ${participantNames}`.toLowerCase().includes(normalizedTerm)
  })
}

export default function EventPage({ manageMode }: EventPageProps): React.JSX.Element {
  const { shareToken: routeShareToken } = useParams<{ shareToken: string }>()
  const [searchTerm, setSearchTerm] = useState('')
  const shareToken = routeShareToken ?? ''
  const adminToken = useStoredAdminToken(shareToken)
  const { data, error, isLoading, refetch } = useEvent(shareToken, manageMode)
  const participantNamesById = new Map((data?.participants ?? []).map((participant) => [participant.id, participant.name]))

  useEffect(() => {
    if (data) {
      recordVisitedEvent(data.event)
    }
  }, [data])

  if (!shareToken) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Typography variant="h2">This event link isn't valid.</Typography>
      </Container>
    )
  }

  const adminLink = adminToken ? `${window.location.origin}/e/${shareToken}/manage#k=${adminToken}` : null

  if (isLoading) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Stack spacing={2} sx={{ alignItems: 'center' }}>
          <CircularProgress />
          <Typography color="text.secondary">Loading event details...</Typography>
        </Stack>
      </Container>
    )
  }

  if (error instanceof ApiClientError && isInvalidLinkError(error)) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Stack spacing={2.5}>
          <Typography variant="h2">This event link isn't valid.</Typography>
          <Typography color="text.secondary">
            The event could not be found from this link.
          </Typography>
        </Stack>
      </Container>
    )
  }

  if (error instanceof ApiClientError) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Stack spacing={2.5}>
          <Alert color="error" icon={<WarningAmberRoundedIcon fontSize="inherit" />}>
            We could not load this event. Request ID: {error.requestId}
          </Alert>
          <Button onClick={() => void refetch()} variant="contained">
            Retry
          </Button>
        </Stack>
      </Container>
    )
  }

  if (!data) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Typography variant="h2">This event link isn't valid.</Typography>
      </Container>
    )
  }

  const visibleItems = filterItems(data.items, participantNamesById, searchTerm)
  const coverageSummary = getEventCoverageSummary(data.items)

  return (
    <Container maxWidth="sm" sx={{ py: 3.5 }}>
      <Stack spacing={3}>
        <Card>
          <CardContent>
            <EventHeader
              adminLink={adminLink}
              coverageSummary={coverageSummary}
              event={data.event}
              isManageMode={manageMode}
              participantsCount={data.participants.length}
            />
          </CardContent>
        </Card>

        <TextField
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon />
              </InputAdornment>
            ),
          }}
          label="Search items or people"
          onChange={(event) => setSearchTerm(event.target.value)}
          value={searchTerm}
        />

        {data.items.length === 0 ? (
          <Card>
            <CardContent>
              <Stack spacing={1.5}>
                <Typography variant="h3">No items yet</Typography>
                <Typography color="text.secondary">
                  This event does not have any items to bring yet. Add items in organiser mode in the next phase.
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        ) : visibleItems.length === 0 ? (
          <Card>
            <CardContent>
              <Typography color="text.secondary">No items match that search.</Typography>
            </CardContent>
          </Card>
        ) : (
          <ItemList
            categories={data.categories}
            items={visibleItems}
            participants={data.participants}
          />
        )}

        <Box sx={{ pb: 2 }} />
      </Stack>
    </Container>
  )
}
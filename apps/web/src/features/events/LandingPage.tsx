import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded'
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded'
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Link,
  Stack,
  Typography,
} from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'

import { getVisitedEvents } from './visitedEvents'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'

export default function LandingPage(): React.JSX.Element {
  useDocumentTitle('ListCollab | Shared event planning')
  const visitedEvents = getVisitedEvents()

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Card>
          <CardContent>
            <Stack spacing={2.5}>
              <Chip
                color="secondary"
                icon={<AddCircleOutlineRoundedIcon />}
                label="Mobile-first event planning"
                sx={{ alignSelf: 'flex-start' }}
              />
              <Typography variant="h1">ListCollab</Typography>
              <Typography color="text.secondary">
                Create a shared event list, send one link, and let everyone see what is covered without bouncing between panels.
              </Typography>
              <Button
                component={RouterLink}
                endIcon={<ArrowForwardRoundedIcon />}
                size="large"
                to="/create"
                variant="contained"
              >
                Create an event
              </Button>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <HistoryRoundedIcon color="primary" />
                <Typography variant="h3">Recently visited</Typography>
              </Stack>

              {visitedEvents.length === 0 ? (
                <Typography color="text.secondary">
                  This browser has not opened any event links yet.
                </Typography>
              ) : (
                <Stack spacing={1.5}>
                  {visitedEvents.map((visitedEvent) => (
                    <Box
                      key={visitedEvent.shareToken}
                      sx={{
                        borderColor: 'divider',
                        borderRadius: 3,
                        borderStyle: 'solid',
                        borderWidth: 1,
                        p: 2,
                      }}
                    >
                      <Stack spacing={0.5}>
                        <Link component={RouterLink} to={`/e/${visitedEvent.shareToken}`} underline="hover">
                          <Typography variant="h4">{visitedEvent.name}</Typography>
                        </Link>
                        <Typography color="text.secondary" variant="body2">
                          Last opened {new Date(visitedEvent.lastVisitedAt).toLocaleString()}
                        </Typography>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Container>
  )
}
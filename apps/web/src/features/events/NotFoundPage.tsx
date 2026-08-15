import SentimentDissatisfiedRoundedIcon from '@mui/icons-material/SentimentDissatisfiedRounded'
import { Button, Container, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'

export default function NotFoundPage(): React.JSX.Element {
  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Stack spacing={2.5} sx={{ alignItems: 'flex-start' }}>
        <SentimentDissatisfiedRoundedIcon color="secondary" fontSize="large" />
        <Typography variant="h2">This page is not available.</Typography>
        <Typography color="text.secondary">
          The link you followed does not point to a screen in this app.
        </Typography>
        <Button component={RouterLink} to="/" variant="contained">
          Go home
        </Button>
      </Stack>
    </Container>
  )
}
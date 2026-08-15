import type { EventItemAssignment, EventItemWithAssignments } from '@listcollab/shared'
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded'
import GroupRoundedIcon from '@mui/icons-material/GroupRounded'
import PlaylistAddRoundedIcon from '@mui/icons-material/PlaylistAddRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded'
import ShareRoundedIcon from '@mui/icons-material/ShareRounded'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  InputAdornment,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { getEventCoverageSummary } from './eventCoverage'
import { EventHeader } from './EventHeader'
import { applyOptimisticAssignment, removeOptimisticAssignment } from './eventOptimisticUpdates'
import { recordVisitedEvent } from './visitedEvents'
import { useEvent } from '../../hooks/useEvent'
import { useEventIdentity, type EventIdentity } from '../../hooks/useEventIdentity'
import { useStoredAdminToken } from '../../hooks/useEventToken'
import { ApiClientError, useApiClient } from '../../services/apiClient'
import { ClaimItemDialog } from '../items/ClaimItemDialog'
import { ItemForm } from '../items/ItemForm'
import { ItemList } from '../items/ItemList'
import { IdentifyDialog } from '../participants/IdentifyDialog'

type EventPageProps = {
  manageMode: boolean
}

type ClaimDialogState = {
  assignment?: EventItemAssignment
  item: EventItemWithAssignments
} | null

type ItemFormState = {
  categoryId: number | null
  item: EventItemWithAssignments | null
  mode: 'guest-create' | 'guest-edit' | 'manage-create' | 'manage-edit'
} | null

type FeedbackState = {
  message: string
  severity: 'error' | 'success'
} | null

type PendingIdentityAction = ((eventIdentity: EventIdentity) => void) | null

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
  const apiClient = useApiClient(routeShareToken, manageMode)
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [claimDialogState, setClaimDialogState] = useState<ClaimDialogState>(null)
  const [feedback, setFeedback] = useState<FeedbackState>(null)
  const [identifyDialogOpen, setIdentifyDialogOpen] = useState(false)
  const [itemFormState, setItemFormState] = useState<ItemFormState>(null)
  const [, setPendingIdentityAction] = useState<PendingIdentityAction>(null)
  const shareToken = routeShareToken ?? ''
  const adminToken = useStoredAdminToken(shareToken)
  const { clearIdentity, identity, setIdentity } = useEventIdentity(shareToken)
  const { data, error, isLoading, refetch } = useEvent(shareToken, manageMode)
  const participantNamesById = new Map((data?.participants ?? []).map((participant) => [participant.id, participant.name]))

  useEffect(() => {
    if (data) {
      recordVisitedEvent(data.event)
    }
  }, [data])

  async function refreshEvent(): Promise<void> {
    await queryClient.invalidateQueries({ queryKey: ['event', shareToken] })
  }

  function runWithIdentity(nextAction: (eventIdentity: EventIdentity) => void): void {
    setPendingIdentityAction(() => nextAction)
    setIdentifyDialogOpen(true)
  }

  function handleParticipantSelection(participantId: number, displayName: string): void {
    const nextIdentity = { participantId, displayName }

    setIdentity(nextIdentity)
    setIdentifyDialogOpen(false)
    setPendingIdentityAction((currentAction: PendingIdentityAction) => {
      if (currentAction) {
        queueMicrotask(() => {
          currentAction(nextIdentity)
        })
      }

      return null
    })
  }

  async function handleCreateParticipant(displayName: string): Promise<EventIdentity> {
    const participant = await apiClient.createParticipant({ name: displayName })
    const nextIdentity = { displayName: participant.name, participantId: participant.id }

    setIdentity(nextIdentity)
    setIdentifyDialogOpen(false)
    setPendingIdentityAction((currentAction: PendingIdentityAction) => {
      if (currentAction) {
        queueMicrotask(() => {
          currentAction(nextIdentity)
        })
      }

      return null
    })
    await refreshEvent()
    return nextIdentity
  }

  function openClaimDialog(item: EventItemWithAssignments, assignment?: EventItemAssignment): void {
    if (!manageMode && !identity) {
      runWithIdentity(() => setClaimDialogState(assignment ? { assignment, item } : { item }))
      return
    }

    setClaimDialogState(assignment ? { assignment, item } : { item })
  }

  function openContributionForm(categoryId: number | null): void {
    if (!manageMode && !identity) {
      runWithIdentity(() =>
        setItemFormState({ categoryId, item: null, mode: 'guest-create' })
      )
      return
    }

    setItemFormState({ categoryId, item: null, mode: manageMode ? 'manage-create' : 'guest-create' })
  }

  async function handleShare(shareUrl: string): Promise<void> {
    try {
      if (navigator.share) {
        await navigator.share({ title: data?.event.name ?? 'ListCollab event', url: shareUrl })
      } else {
        await navigator.clipboard.writeText(shareUrl)
      }

      setFeedback({ message: 'Link ready to share.', severity: 'success' })
    } catch {
      setFeedback({ message: 'We could not share that link.', severity: 'error' })
    }
  }

  async function handleCopy(shareUrl: string, successMessage: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setFeedback({ message: successMessage, severity: 'success' })
    } catch {
      setFeedback({ message: 'We could not copy that link.', severity: 'error' })
    }
  }

  async function handleClaimSave(payload: { note: string | null; participantId: number; quantity: number }): Promise<void> {
    if (!claimDialogState) {
      return
    }

    const queryKey = ['event', shareToken] as const
    const previousData = queryClient.getQueryData<typeof data>(queryKey)

    if (previousData) {
      queryClient.setQueryData(
        queryKey,
        applyOptimisticAssignment(previousData, {
          itemId: claimDialogState.item.id,
          note: payload.note,
          participantId: payload.participantId,
          quantity: payload.quantity,
          ...(claimDialogState.assignment ? { assignment: claimDialogState.assignment } : {}),
        })
      )
    }

    try {
      if (claimDialogState.assignment) {
        await apiClient.updateAssignment(claimDialogState.assignment.id, payload)
      } else {
        await apiClient.claimItem(claimDialogState.item.id, payload)
      }

      setClaimDialogState(null)
      setFeedback({ message: 'Claim saved.', severity: 'success' })
      await refreshEvent()
    } catch (caughtError) {
      if (previousData) {
        queryClient.setQueryData(queryKey, previousData)
      }

      if (caughtError instanceof ApiClientError && caughtError.code === 'OVER_CLAIM') {
        setFeedback({ message: 'Someone else claimed that amount first. The list has been refreshed.', severity: 'error' })
        await refreshEvent()
        throw caughtError
      }

      setFeedback({ message: 'We could not save that claim.', severity: 'error' })
      await refreshEvent()
      throw caughtError
    }
  }

  async function handleDeleteAssignment(assignmentId: number, participantId: number): Promise<void> {
    const queryKey = ['event', shareToken] as const
    const previousData = queryClient.getQueryData<typeof data>(queryKey)

    if (previousData) {
      queryClient.setQueryData(queryKey, removeOptimisticAssignment(previousData, assignmentId))
    }

    try {
      await apiClient.deleteAssignment(assignmentId, { participantId: manageMode ? undefined : participantId })
      setClaimDialogState(null)
      setFeedback({ message: 'Claim removed.', severity: 'success' })
      await refreshEvent()
    } catch (caughtError) {
      if (previousData) {
        queryClient.setQueryData(queryKey, previousData)
      }

      setFeedback({ message: 'We could not remove that claim.', severity: 'error' })
      await refreshEvent()
      throw caughtError
    }
  }

  async function handleCreateItem(input: Parameters<typeof apiClient.createItem>[0]): Promise<void> {
    const createdItem = await apiClient.createItem(input)

    if (!manageMode && input.createdBy) {
      await apiClient.claimItem(createdItem.id, { participantId: input.createdBy, quantity: 1 })
    }

    setItemFormState(null)
    setFeedback({ message: manageMode ? 'Requirement added.' : 'Contribution added.', severity: 'success' })
    await refreshEvent()
  }

  async function handleUpdateItem(itemId: number, input: Parameters<typeof apiClient.updateItem>[1]): Promise<void> {
    await apiClient.updateItem(itemId, input)
    setItemFormState(null)
    setFeedback({ message: 'Item updated.', severity: 'success' })
    await refreshEvent()
  }

  async function handleDeleteItem(item: EventItemWithAssignments): Promise<void> {
    if (!window.confirm(`Delete ${item.name}?`)) {
      return
    }

    await apiClient.deleteItem(item.id)
    setFeedback({ message: 'Item deleted.', severity: 'success' })
    await refreshEvent()
  }

  async function handleDeleteParticipant(participantId: number, displayName: string): Promise<void> {
    if (!window.confirm(`Remove ${displayName} and their claims?`)) {
      return
    }

    await apiClient.deleteParticipant(participantId)
    setFeedback({ message: 'Participant removed.', severity: 'success' })
    await refreshEvent()
  }

  async function handleCategoryPrompt(categoryId: number | null, currentName?: string): Promise<void> {
    const categoryName = window.prompt('Category name', currentName ?? '')?.trim()

    if (!categoryName) {
      return
    }

    if (categoryId === null) {
      await apiClient.createCategory({ name: categoryName, sortOrder: data?.categories.length ?? 0 })
      setFeedback({ message: 'Category added.', severity: 'success' })
    } else {
      await apiClient.updateCategory(categoryId, { name: categoryName })
      setFeedback({ message: 'Category updated.', severity: 'success' })
    }

    await refreshEvent()
  }

  async function handleDeleteCategory(categoryId: number, categoryName: string): Promise<void> {
    if (!window.confirm(`Delete ${categoryName}? Items will become uncategorised.`)) {
      return
    }

    await apiClient.deleteCategory(categoryId)
    setFeedback({ message: 'Category deleted.', severity: 'success' })
    await refreshEvent()
  }

  async function handleEventSettings(): Promise<void> {
    const currentEvent = data!.event
    const name = window.prompt('Event name', currentEvent.name)?.trim()

    if (!name) {
      return
    }

    await apiClient.updateEvent(shareToken, {
      description: currentEvent.description,
      eventDate: currentEvent.eventDate,
      location: currentEvent.location,
      name,
    })
    setFeedback({ message: 'Event details updated.', severity: 'success' })
    await refreshEvent()
  }

  async function handleDeleteEvent(): Promise<void> {
    if (!window.confirm('Delete this event for everyone?')) {
      return
    }

    await apiClient.deleteEvent(shareToken)
    window.location.assign('/')
  }

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
  const shareUrl = `${window.location.origin}/e/${shareToken}`

  return (
    <Container maxWidth="sm" sx={{ py: 3.5 }}>
      <Stack spacing={3}>
        {feedback ? (
          <Alert color={feedback.severity === 'error' ? 'error' : 'success'}>
            {feedback.message}
          </Alert>
        ) : null}

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

        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                <Chip
                  color={identity ? 'primary' : 'default'}
                  icon={<GroupRoundedIcon />}
                  label={identity ? `You are ${identity.displayName}` : 'Read-only until you identify yourself'}
                />
                {identity ? (
                  <Button onClick={clearIdentity} variant="text">
                    Not you?
                  </Button>
                ) : null}
              </Stack>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                <Button onClick={() => void handleShare(shareUrl)} startIcon={<ShareRoundedIcon />} variant="contained">
                  Share event
                </Button>
                <Button onClick={() => void handleCopy(shareUrl, 'Share link copied.')} startIcon={<ContentCopyRoundedIcon />} variant="outlined">
                  Copy share link
                </Button>
                {!manageMode ? (
                  <Button onClick={() => openContributionForm(null)} startIcon={<PlaylistAddRoundedIcon />} variant="outlined">
                    Add your contribution
                  </Button>
                ) : null}
              </Stack>

              {manageMode ? (
                <Stack spacing={1.5}>
                  <Divider />
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                    <Button onClick={() => void handleEventSettings()} startIcon={<SettingsRoundedIcon />} variant="outlined">
                      Edit event
                    </Button>
                    <Button onClick={() => openContributionForm(null)} startIcon={<PlaylistAddRoundedIcon />} variant="outlined">
                      Add requirement
                    </Button>
                    <Button color="error" onClick={() => void handleDeleteEvent()} variant="outlined">
                      Delete event
                    </Button>
                  </Stack>
                  <Stack spacing={1}>
                    <Typography variant="h4">Participants</Typography>
                    <List disablePadding>
                      {data.participants.map((participant) => (
                        <ListItem divider key={participant.id}>
                          <ListItemText primary={participant.name} />
                          <ListItemSecondaryAction>
                            <Button color="error" onClick={() => void handleDeleteParticipant(participant.id, participant.name)} variant="text">
                              Remove
                            </Button>
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </List>
                    <Button onClick={() => void handleCategoryPrompt(null)} variant="text">
                      Add category
                    </Button>
                  </Stack>
                </Stack>
              ) : null}
            </Stack>
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
            currentIdentity={identity}
            isManageMode={manageMode}
            items={visibleItems}
            onAddItem={openContributionForm}
            onClaim={openClaimDialog}
            onDeleteCategory={(category) => void handleDeleteCategory(category.id, category.name)}
            onDeleteItem={(item) => void handleDeleteItem(item)}
            onEditCategory={(category) => void handleCategoryPrompt(category.id, category.name)}
            onEditItem={(item) =>
              setItemFormState({
                categoryId: item.categoryId,
                item,
                mode: manageMode ? 'manage-edit' : 'guest-edit',
              })}
            participants={data.participants}
          />
        )}

        <Box sx={{ pb: 2 }} />
      </Stack>

      <IdentifyDialog
        existingParticipants={data.participants}
        isOpen={identifyDialogOpen}
        onClose={() => {
          setIdentifyDialogOpen(false)
          setPendingIdentityAction(null)
        }}
        onCreateParticipant={handleCreateParticipant}
        onSelectParticipant={(participant) => handleParticipantSelection(participant.id, participant.name)}
      />

      <ClaimItemDialog
        identity={identity}
        isManageMode={manageMode}
        isOpen={Boolean(claimDialogState)}
        item={claimDialogState?.item ?? null}
        onClose={() => setClaimDialogState(null)}
        onDeleteAssignment={handleDeleteAssignment}
        onSave={handleClaimSave}
        participants={data.participants}
        {...(claimDialogState?.assignment ? { assignment: claimDialogState.assignment } : {})}
      />

      <ItemForm
        categories={data.categories}
        identity={identity}
        initialCategoryId={itemFormState?.categoryId ?? null}
        isOpen={Boolean(itemFormState)}
        item={itemFormState?.item ?? null}
        mode={itemFormState?.mode ?? 'guest-create'}
        onClose={() => setItemFormState(null)}
        onCreate={handleCreateItem}
        onUpdate={handleUpdateItem}
      />
    </Container>
  )
}
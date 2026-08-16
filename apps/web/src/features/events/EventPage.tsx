import type { EventCategory, EventItemAssignment, EventItemWithAssignments } from '@listcollab/shared'
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
  Container,
  Divider,
  InputAdornment,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  Skeleton,
  Snackbar,
  Stack,
  TextField,
  Typography,
  useScrollTrigger,
} from '@mui/material'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { getEventCoverageSummary } from './eventCoverage'
import { EventHeader } from './EventHeader'
import { applyOptimisticAssignment, removeOptimisticAssignment } from './eventOptimisticUpdates'
import { recordVisitedEvent } from './visitedEvents'
import { ConfirmationDialog } from '../../components/ConfirmationDialog'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { useEvent } from '../../hooks/useEvent'
import { useEventIdentity, type EventIdentity } from '../../hooks/useEventIdentity'
import { useStoredAdminToken } from '../../hooks/useEventToken'
import { ApiClientError, useApiClient } from '../../services/apiClient'
import { CategoryForm } from '../categories/CategoryForm'
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
  requestId?: string
  severity: 'error' | 'success'
} | null

type CategoryFormState = {
  category: EventCategory | null
} | null

type PendingIdentityAction = ((eventIdentity: EventIdentity) => void) | null

type ConfirmationDialogState = {
  confirmButtonLabel: string
  confirmationLabel?: string
  confirmationValue?: string
  description: string
  title: string
  onConfirm: () => Promise<void>
} | null

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

function getFeedbackMessage(feedback: Exclude<FeedbackState, null>): string {
  if (feedback.severity === 'error' && feedback.requestId) {
    return `${feedback.message} Request ID: ${feedback.requestId}`
  }

  return feedback.message
}

function EventPageLoadingState(): React.JSX.Element {
  return (
    <Container maxWidth="sm" sx={{ py: 3.5 }}>
      <Stack aria-label="Loading event details" spacing={3}>
        <Card
          sx={{
            position: 'sticky',
            top: 12,
            zIndex: 2,
          }}
        >
          <CardContent>
            <Stack spacing={2}>
              <Skeleton height={36} variant="rounded" width="55%" />
              <Stack direction="row" spacing={1}>
                <Skeleton height={32} variant="rounded" width={96} />
                <Skeleton height={32} variant="rounded" width={160} />
              </Stack>
              <Skeleton height={18} variant="text" width="80%" />
              <Skeleton height={18} variant="text" width="62%" />
            </Stack>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Skeleton height={48} variant="rounded" />
              <Skeleton height={52} variant="rounded" />
              <Skeleton height={132} variant="rounded" />
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Container>
  )
}

export default function EventPage({ manageMode }: EventPageProps): React.JSX.Element {
  const isHeaderCondensed = useScrollTrigger({
    disableHysteresis: true,
    threshold: 96,
  })
  const { shareToken: routeShareToken } = useParams<{ shareToken: string }>()
  const apiClient = useApiClient(routeShareToken, manageMode)
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [claimDialogState, setClaimDialogState] = useState<ClaimDialogState>(null)
  const [feedback, setFeedback] = useState<FeedbackState>(null)
  const [confirmationDialogState, setConfirmationDialogState] = useState<ConfirmationDialogState>(null)
  const [categoryFormState, setCategoryFormState] = useState<CategoryFormState>(null)
  const [isConfirmingAction, setIsConfirmingAction] = useState(false)
  const [identifyDialogOpen, setIdentifyDialogOpen] = useState(false)
  const [itemFormState, setItemFormState] = useState<ItemFormState>(null)
  const [, setPendingIdentityAction] = useState<PendingIdentityAction>(null)
  const shareToken = routeShareToken ?? ''
  const adminToken = useStoredAdminToken(shareToken)
  const { clearIdentity, identity, setIdentity } = useEventIdentity(shareToken)
  const { data, error, isLoading, refetch } = useEvent(shareToken, manageMode)
  const participantNamesById = new Map((data?.participants ?? []).map((participant) => [participant.id, participant.name]))
  const pageTitle = !shareToken
    ? 'Event unavailable | ListCollab'
    : isLoading
      ? 'Loading event | ListCollab'
      : error instanceof ApiClientError && isInvalidLinkError(error)
        ? 'Event unavailable | ListCollab'
        : error instanceof ApiClientError
          ? 'Unable to load event | ListCollab'
          : data
            ? `${data.event.name}${manageMode ? ' - Organiser' : ''} | ListCollab`
            : 'Event unavailable | ListCollab'

  useDocumentTitle(pageTitle)

  useEffect(() => {
    if (data) {
      recordVisitedEvent(data.event)
    }
  }, [data])

  async function refreshEvent(): Promise<void> {
    await queryClient.invalidateQueries({ queryKey: ['event', shareToken] })
  }

  async function runConfirmedAction(): Promise<void> {
    if (!confirmationDialogState) {
      return
    }

    setIsConfirmingAction(true)

    try {
      await confirmationDialogState.onConfirm()
      setConfirmationDialogState(null)
    } catch (caughtError) {
      setFeedback({
        message: 'We could not complete that action.',
        severity: 'error',
        ...(caughtError instanceof ApiClientError ? { requestId: caughtError.requestId } : {}),
      })
    } finally {
      setIsConfirmingAction(false)
    }
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
        setFeedback({ message: 'Someone else claimed that amount first. The list has been refreshed.', requestId: caughtError.requestId, severity: 'error' })
        await refreshEvent()
        throw caughtError
      }

      setFeedback({
        message: 'We could not save that claim.',
        severity: 'error',
        ...(caughtError instanceof ApiClientError ? { requestId: caughtError.requestId } : {}),
      })
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

      setFeedback({
        message: 'We could not remove that claim.',
        severity: 'error',
        ...(caughtError instanceof ApiClientError ? { requestId: caughtError.requestId } : {}),
      })
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
    await apiClient.deleteItem(item.id)
    setFeedback({ message: 'Item deleted.', severity: 'success' })
    await refreshEvent()
  }

  async function handleDeleteParticipant(participantId: number): Promise<void> {
    await apiClient.deleteParticipant(participantId)
    setFeedback({ message: 'Participant removed.', severity: 'success' })
    await refreshEvent()
  }

  async function handleSaveCategory(input: { icon: string; name: string }): Promise<void> {
    if (categoryFormState?.category) {
      await apiClient.updateCategory(categoryFormState.category.id, input)
      setFeedback({ message: 'Category updated.', severity: 'success' })
    } else {
      await apiClient.createCategory({ ...input, sortOrder: data?.categories.length ?? 0 })
      setFeedback({ message: 'Category added.', severity: 'success' })
    }

    setCategoryFormState(null)
    await refreshEvent()
  }

  async function handleMoveCategory(categoryId: number, direction: -1 | 1): Promise<void> {
    const orderedCategories = data!.categories.slice().sort((leftCategory, rightCategory) => leftCategory.sortOrder - rightCategory.sortOrder)
    const currentIndex = orderedCategories.findIndex((category) => category.id === categoryId)

    if (currentIndex === -1) {
      return
    }

    const swapCategory = orderedCategories[currentIndex + direction]
    const currentCategory = orderedCategories[currentIndex]

    if (!swapCategory || !currentCategory) {
      return
    }

    await Promise.all([
      apiClient.updateCategory(currentCategory.id, { sortOrder: swapCategory.sortOrder }),
      apiClient.updateCategory(swapCategory.id, { sortOrder: currentCategory.sortOrder }),
    ])

    setFeedback({ message: 'Category order updated.', severity: 'success' })
    await refreshEvent()
  }

  async function handleDeleteCategory(categoryId: number): Promise<void> {
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
    return <EventPageLoadingState />
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
  const event = data.event

  function openDeleteItemDialog(item: EventItemWithAssignments): void {
    setConfirmationDialogState({
      confirmButtonLabel: 'Delete item',
      description: `Delete ${item.name} for everyone? This removes it from the list entirely.`,
      onConfirm: () => handleDeleteItem(item),
      title: 'Delete item',
    })
  }

  function openDeleteParticipantDialog(participantId: number, displayName: string): void {
    const claimsCount = data!.items.reduce(
      (total, item) => total + item.assignments.filter((assignment) => assignment.participantId === participantId).length,
      0
    )
    const claimLabel = `${claimsCount} claim${claimsCount === 1 ? '' : 's'}`

    setConfirmationDialogState({
      confirmButtonLabel: 'Remove participant',
      description: `Remove ${displayName}? ${claimLabel} will be removed from the list.`,
      onConfirm: () => handleDeleteParticipant(participantId),
      title: 'Remove participant',
    })
  }

  function openDeleteCategoryDialog(categoryId: number, categoryName: string): void {
    const affectedItems = data!.items.filter((item) => item.categoryId === categoryId).length
    const itemLabel = `${affectedItems} item${affectedItems === 1 ? '' : 's'}`

    setConfirmationDialogState({
      confirmButtonLabel: 'Delete category',
      description: `Delete ${categoryName}? ${itemLabel} will become uncategorised.`,
      onConfirm: () => handleDeleteCategory(categoryId),
      title: 'Delete category',
    })
  }

  function openDeleteEventDialog(): void {
    setConfirmationDialogState({
      confirmButtonLabel: 'Delete event',
      confirmationLabel: 'Type the event name to confirm',
      confirmationValue: event.name,
      description: 'This deletes the event, every requirement, and every claim for everyone.',
      onConfirm: () => handleDeleteEvent(),
      title: 'Delete event',
    })
  }

  return (
    <Container maxWidth="sm" sx={{ py: 3.5 }}>
      <Stack spacing={3}>
        <Card>
          <CardContent
            sx={{
              backdropFilter: isHeaderCondensed ? 'blur(14px)' : 'none',
              py: isHeaderCondensed ? 2 : 3,
              transition: 'padding 180ms ease, backdrop-filter 180ms ease',
            }}
          >
            <EventHeader
              adminLink={adminLink}
              coverageSummary={coverageSummary}
              event={data.event}
              isCondensed={isHeaderCondensed}
              isManageMode={manageMode}
              onCopyAdminLink={adminLink ? () => void handleCopy(adminLink, 'Organiser link copied.') : undefined}
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
                    <Button color="error" onClick={openDeleteEventDialog} variant="outlined">
                      Delete event
                    </Button>
                  </Stack>
                  <Stack spacing={1}>
                    <Typography variant="h4">Participants</Typography>
                    <List disablePadding>
                      {data.participants.length === 0 ? (
                        <ListItem>
                          <ListItemText secondary="No participants yet. Claims will appear here as people identify themselves." />
                        </ListItem>
                      ) : (
                        data.participants.map((participant) => (
                          <ListItem divider key={participant.id}>
                            <ListItemText primary={participant.name} />
                            <ListItemSecondaryAction>
                              <Button color="error" onClick={() => openDeleteParticipantDialog(participant.id, participant.name)} variant="text">
                                Remove
                              </Button>
                            </ListItemSecondaryAction>
                          </ListItem>
                        ))
                      )}
                    </List>
                    <Button onClick={() => setCategoryFormState({ category: null })} variant="text">
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
                  {manageMode
                    ? 'This event does not have any items yet. Add the first requirement to get the list moving.'
                    : 'This event does not have any items yet. Ask the organiser to add a requirement or add your own contribution.'}
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
            onDeleteCategory={(category) => openDeleteCategoryDialog(category.id, category.name)}
            onDeleteItem={openDeleteItemDialog}
            onEditCategory={(category) => setCategoryFormState({ category })}
            onEditItem={(item) =>
              setItemFormState({
                categoryId: item.categoryId,
                item,
                mode: manageMode ? 'manage-edit' : 'guest-edit',
              })}
            onMoveCategoryDown={(category) => void handleMoveCategory(category.id, 1)}
            onMoveCategoryUp={(category) => void handleMoveCategory(category.id, -1)}
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

      <CategoryForm
        category={categoryFormState?.category ?? null}
        isOpen={Boolean(categoryFormState)}
        onClose={() => setCategoryFormState(null)}
        onSave={handleSaveCategory}
      />

      <Snackbar
        anchorOrigin={{ horizontal: 'center', vertical: 'bottom' }}
        autoHideDuration={5000}
        onClose={(_event, reason) => {
          if (reason === 'clickaway') {
            return
          }

          setFeedback(null)
        }}
        open={Boolean(feedback)}
      >
        <Alert
          aria-live={feedback?.severity === 'error' ? 'assertive' : 'polite'}
          color={feedback?.severity === 'error' ? 'error' : 'success'}
          onClose={() => setFeedback(null)}
          role={feedback?.severity === 'error' ? 'alert' : 'status'}
          variant="filled"
        >
          {feedback ? getFeedbackMessage(feedback) : ''}
        </Alert>
      </Snackbar>

      <ConfirmationDialog
        confirmButtonLabel={confirmationDialogState?.confirmButtonLabel ?? 'Confirm'}
        description={confirmationDialogState?.description ?? ''}
        isConfirming={isConfirmingAction}
        isOpen={Boolean(confirmationDialogState)}
        onClose={() => {
          if (!isConfirmingAction) {
            setConfirmationDialogState(null)
          }
        }}
        onConfirm={() => {
          void runConfirmedAction()
        }}
        title={confirmationDialogState?.title ?? 'Confirm action'}
        {...(confirmationDialogState?.confirmationLabel ? { confirmationLabel: confirmationDialogState.confirmationLabel } : {})}
        {...(confirmationDialogState?.confirmationValue ? { confirmationValue: confirmationDialogState.confirmationValue } : {})}
      />
    </Container>
  )
}
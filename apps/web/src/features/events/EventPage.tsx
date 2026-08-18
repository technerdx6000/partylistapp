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
  Paper,
  Skeleton,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  useMediaQuery,
  Typography,
  useScrollTrigger,
  useTheme,
} from '@mui/material'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'

import { getEventCoverageSummary } from './eventCoverage'
import { EventHeader } from './EventHeader'
import { applyOptimisticAssignment, removeOptimisticAssignment } from './eventOptimisticUpdates'
import { EventSummaryTable } from './EventSummaryTable'
import { MobileCategoryNav } from './MobileCategoryNav'
import { MobileOrganiserPanel } from './MobileOrganiserPanel'
import { recordVisitedEvent } from './visitedEvents'
import { ConfirmationDialog } from '../../components/ConfirmationDialog'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { useEvent } from '../../hooks/useEvent'
import { useEventIdentity, type EventIdentity } from '../../hooks/useEventIdentity'
import { useStoredAdminToken } from '../../hooks/useEventToken'
import { ApiClientError, useApiClient } from '../../services/apiClient'
import { CategoryForm } from '../categories/CategoryForm'
import { ClaimItemDialog } from '../items/ClaimItemDialog'
import { groupItemsByCategory } from '../items/groupItemsByCategory'
import { ItemDetailSurface, type ItemDetailMode } from '../items/ItemDetailSurface'
import { ItemForm, type ItemFormCreatePayload } from '../items/ItemForm'
import { ItemList } from '../items/ItemList'
import { IdentifyDialog } from '../participants/IdentifyDialog'
import { ParticipantManagerDialog } from '../participants/ParticipantManagerDialog'

type EventPageProps = {
  manageMode: boolean
}

type ClaimDialogState = {
  assignment?: EventItemAssignment
  item: EventItemWithAssignments
} | null

type ItemFormState = {
  categoryId: number | null
  createdByParticipantId?: number | null
  item: EventItemWithAssignments | null
  mode: 'guest-create' | 'guest-edit' | 'manage-create' | 'manage-edit'
} | null

type ItemDetailState = {
  itemId: number
  mode: ItemDetailMode
} | null

type EventPageTab = 'all' | 'mine' | 'summary'

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

function filterItemsByTab(
  items: readonly EventItemWithAssignments[],
  participantId: number | null,
  activeTab: EventPageTab
): readonly EventItemWithAssignments[] {
  if (activeTab !== 'mine' || participantId === null) {
    return items
  }

  return items.filter((item) => item.assignments.some((assignment) => assignment.participantId === participantId))
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
  const theme = useTheme()
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const isHeaderCondensed = useScrollTrigger({
    disableHysteresis: true,
    threshold: 96,
  })
  const { shareToken: routeShareToken } = useParams<{ shareToken: string }>()
  const apiClient = useApiClient(routeShareToken, manageMode)
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<EventPageTab>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [claimDialogState, setClaimDialogState] = useState<ClaimDialogState>(null)
  const [feedback, setFeedback] = useState<FeedbackState>(null)
  const [confirmationDialogState, setConfirmationDialogState] = useState<ConfirmationDialogState>(null)
  const [categoryFormState, setCategoryFormState] = useState<CategoryFormState>(null)
  const [activeMobileGroupKey, setActiveMobileGroupKey] = useState<string | null>(null)
  const [isConfirmingAction, setIsConfirmingAction] = useState(false)
  const [identifyDialogOpen, setIdentifyDialogOpen] = useState(false)
  const [itemDetailState, setItemDetailState] = useState<ItemDetailState>(null)
  const [itemFormState, setItemFormState] = useState<ItemFormState>(null)
  const [isParticipantManagerOpen, setIsParticipantManagerOpen] = useState(false)
  const [, setPendingIdentityAction] = useState<PendingIdentityAction>(null)
  const hasTransientOverlayHistoryEntryRef = useRef(false)
  const shareToken = routeShareToken ?? ''
  const adminToken = useStoredAdminToken(shareToken)
  const { clearIdentity, identity, setIdentity } = useEventIdentity(shareToken)
  const { data, error, isLoading, refetch } = useEvent(shareToken, manageMode)
  const participantNamesById = new Map((data?.participants ?? []).map((participant) => [participant.id, participant.name]))
  const isSearchActive = searchTerm.trim().length > 0
  const tabFilteredItems = filterItemsByTab(data?.items ?? [], identity?.participantId ?? null, activeTab)
  const visibleItems = filterItems(tabFilteredItems, participantNamesById, searchTerm)
  const visibleCategoryIds = new Set(visibleItems.flatMap((item) => (item.categoryId === null ? [] : [item.categoryId])))
  const visibleCategories = data
    ? activeTab === 'all' && !isSearchActive
      ? data.categories
      : data.categories.filter((category) => visibleCategoryIds.has(category.id))
    : []
  const groupedItemSections = groupItemsByCategory(visibleCategories, visibleItems).filter((group) => group.items.length > 0)
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

  useEffect(() => {
    if (!identity && activeTab === 'mine') {
      setActiveTab('all')
    }
  }, [activeTab, identity])

  useEffect(() => {
    if (!isSmallScreen || activeTab === 'summary') {
      return
    }

    if (groupedItemSections.length === 0) {
      if (activeMobileGroupKey !== null) {
        setActiveMobileGroupKey(null)
      }

      return
    }

    if (activeMobileGroupKey && groupedItemSections.some((group) => group.key === activeMobileGroupKey)) {
      return
    }

    setActiveMobileGroupKey(groupedItemSections[0]?.key ?? null)
  }, [activeMobileGroupKey, activeTab, groupedItemSections, isSmallScreen])

  const hasTransientOverlay = Boolean(
    claimDialogState ||
      confirmationDialogState ||
      categoryFormState ||
      identifyDialogOpen ||
      itemDetailState ||
      itemFormState ||
      isParticipantManagerOpen
  )

  const closeTopTransientOverlay = useCallback((): void => {
    if (confirmationDialogState) {
      if (!isConfirmingAction) {
        setConfirmationDialogState(null)
      }
      return
    }

    if (identifyDialogOpen) {
      setIdentifyDialogOpen(false)
      setPendingIdentityAction(null)
      return
    }

    if (itemFormState) {
      setItemFormState(null)
      return
    }

    if (claimDialogState) {
      setClaimDialogState(null)
      return
    }

    if (itemDetailState) {
      setItemDetailState(null)
      return
    }
    if (categoryFormState) {
      setCategoryFormState(null)
      return
    }

    if (isParticipantManagerOpen) {
      setIsParticipantManagerOpen(false)
    }
  }, [categoryFormState, claimDialogState, confirmationDialogState, identifyDialogOpen, isConfirmingAction, isParticipantManagerOpen, itemDetailState, itemFormState])

  useEffect(() => {
    if (hasTransientOverlay && !hasTransientOverlayHistoryEntryRef.current) {
      window.history.pushState({ listcollabOverlay: true }, '', window.location.href)
      hasTransientOverlayHistoryEntryRef.current = true
      return
    }

    if (!hasTransientOverlay) {
      hasTransientOverlayHistoryEntryRef.current = false
    }
  }, [hasTransientOverlay])

  useEffect(() => {
    function handlePopState(): void {
      if (!hasTransientOverlay) {
        return
      }

      hasTransientOverlayHistoryEntryRef.current = false
      closeTopTransientOverlay()
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [closeTopTransientOverlay, hasTransientOverlay])

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

  function bindIdentityToOpenContributionForm(eventIdentity: EventIdentity): void {
    setItemFormState((currentState) => {
      if (currentState?.mode !== 'guest-create') {
        return currentState
      }

      return {
        ...currentState,
        createdByParticipantId: eventIdentity.participantId,
      }
    })
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
      runWithIdentity((eventIdentity) =>
        setItemFormState({ categoryId, createdByParticipantId: eventIdentity.participantId, item: null, mode: 'guest-create' })
      )
      return
    }

    setItemFormState({
      categoryId,
      createdByParticipantId: manageMode ? null : (identity?.participantId ?? null),
      item: null,
      mode: manageMode ? 'manage-create' : 'guest-create',
    })
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

  async function handleCreateItem(input: ItemFormCreatePayload): Promise<void> {
    const { claimQuantity, ...createInput } = input

    if (!manageMode && !createInput.createdBy) {
      runWithIdentity(bindIdentityToOpenContributionForm)
      return
    }

    const createdItem = await apiClient.createItem(createInput)

    if (!manageMode && createInput.createdBy) {
      await apiClient.claimItem(createdItem.id, { participantId: createInput.createdBy, quantity: claimQuantity ?? 1 })
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

  const coverageSummary = getEventCoverageSummary(data.items)
  const showItemVisibilityTabs = data.items.length > 0
  const mobileItemVisibilityBarOffset = showItemVisibilityTabs && isSmallScreen ? 'calc(112px + env(safe-area-inset-bottom, 0px))' : null
  const showMobileCategoryNav = activeTab !== 'summary' && isSmallScreen && groupedItemSections.length > 1 && visibleItems.length > 0
  const visibleGroupKey = isSmallScreen && !isSearchActive ? (activeMobileGroupKey ?? groupedItemSections[0]?.key) : undefined
  const shareUrl = `${window.location.origin}/e/${shareToken}`
  const event = data.event
  const shareActionLabel = isSmallScreen ? 'Share' : 'Share event'
  const copyActionLabel = isSmallScreen ? 'Copy link' : 'Copy share link'
  const contributionActionLabel = isSmallScreen ? 'Add yours' : 'Add your contribution'
  const selectedDetailItem = itemDetailState
    ? data.items.find((candidateItem) => candidateItem.id === itemDetailState.itemId) ?? null
    : null

  function openItemDetail(item: EventItemWithAssignments, mode: ItemDetailMode = 'view'): void {
    setItemDetailState({ itemId: item.id, mode })
  }

  function closeItemDetail(): void {
    setItemDetailState(null)
  }

  function openItemEditForm(item: EventItemWithAssignments): void {
    setItemFormState({
      categoryId: item.categoryId,
      item,
      mode: manageMode ? 'manage-edit' : 'guest-edit',
    })
  }

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

  const itemVisibilityTabs = (
    <Tabs
      aria-label="Event view"
      onChange={(_event, nextValue: EventPageTab) => setActiveTab(nextValue)}
      sx={{
        minHeight: 0,
        ...(isSmallScreen
          ? {
              '& .MuiTabs-flexContainer': {
                gap: 0,
              },
              '& .MuiTabs-indicator': {
                backgroundColor: 'primary.main',
                borderRadius: 0,
                height: 3,
              },
              '& .MuiTab-root': {
                color: 'text.secondary',
                flex: 1,
                fontSize: '0.95rem',
                fontWeight: 700,
                minHeight: 52,
                minWidth: 0,
                px: 1,
                textTransform: 'none',
              },
              '& .MuiTab-root.Mui-selected': {
                color: 'primary.main',
              },
              '& .MuiTab-root.Mui-disabled': {
                color: 'text.disabled',
                opacity: 0.72,
              },
            }
          : {
              bgcolor: 'background.paper',
              borderRadius: 3,
              px: 0.5,
              '& .MuiTabs-indicator': {
                borderRadius: 999,
                height: 3,
              },
              '& .MuiTab-root': {
                minHeight: 44,
                textTransform: 'none',
              },
            }),
      }}
      value={activeTab}
      variant="fullWidth"
    >
      <Tab label="All Items" value="all" />
      <Tab disabled={!identity} label="My Items" value="mine" />
      <Tab label="Summary" value="summary" />
    </Tabs>
  )

  return (
    <Container maxWidth="sm" sx={{ pb: mobileItemVisibilityBarOffset ?? 3.5, pt: 3.5 }}>
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
              <Stack
                direction="row"
                spacing={1}
                sx={{
                  flexWrap: isSmallScreen ? 'nowrap' : 'wrap',
                  gap: 1,
                }}
              >
                <Button
                  aria-label="Share event"
                  onClick={() => void handleShare(shareUrl)}
                  size={isSmallScreen ? 'small' : 'medium'}
                  startIcon={<ShareRoundedIcon />}
                  sx={
                    isSmallScreen
                      ? {
                          '& .MuiButton-startIcon': {
                            marginLeft: 0,
                            marginRight: 0.5,
                          },
                          borderRadius: 2,
                          flex: '1 1 0',
                          fontSize: '0.875rem',
                          minHeight: 38,
                          minWidth: 0,
                          px: 1.25,
                          whiteSpace: 'nowrap',
                        }
                      : undefined
                  }
                  variant={isSmallScreen ? 'outlined' : 'contained'}
                >
                  {shareActionLabel}
                </Button>
                <Button
                  aria-label="Copy share link"
                  onClick={() => void handleCopy(shareUrl, 'Share link copied.')}
                  size={isSmallScreen ? 'small' : 'medium'}
                  startIcon={<ContentCopyRoundedIcon />}
                  sx={
                    isSmallScreen
                      ? {
                          '& .MuiButton-startIcon': {
                            marginLeft: 0,
                            marginRight: 0.5,
                          },
                          borderRadius: 2,
                          flex: '1 1 0',
                          fontSize: '0.875rem',
                          minHeight: 38,
                          minWidth: 0,
                          px: 1.25,
                          whiteSpace: 'nowrap',
                        }
                      : undefined
                  }
                  variant="outlined"
                >
                  {copyActionLabel}
                </Button>
                {!manageMode ? (
                  <Button
                    aria-label="Add your contribution"
                    onClick={() => openContributionForm(null)}
                    size={isSmallScreen ? 'small' : 'medium'}
                    startIcon={<PlaylistAddRoundedIcon />}
                    sx={
                      isSmallScreen
                        ? {
                            '& .MuiButton-startIcon': {
                              marginLeft: 0,
                              marginRight: 0.5,
                            },
                            borderRadius: 2,
                            flex: '1 1 0',
                            fontSize: '0.875rem',
                            minHeight: 38,
                            minWidth: 0,
                            px: 1.25,
                            whiteSpace: 'nowrap',
                          }
                        : undefined
                    }
                    variant="outlined"
                  >
                    {contributionActionLabel}
                  </Button>
                ) : null}
              </Stack>

              {manageMode ? (
                isSmallScreen ? (
                  <MobileOrganiserPanel
                    onAddCategory={() => setCategoryFormState({ category: null })}
                    onAddRequirement={() => openContributionForm(null)}
                    onDeleteEvent={openDeleteEventDialog}
                    onEditEvent={() => void handleEventSettings()}
                    onOpenParticipants={() => setIsParticipantManagerOpen(true)}
                    participantsCount={data.participants.length}
                  />
                ) : (
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
                )
              ) : null}
            </Stack>
          </CardContent>
        </Card>

        {showItemVisibilityTabs && !isSmallScreen ? (
          <Stack spacing={1}>
            {itemVisibilityTabs}
            {!identity ? (
              <Typography color="text.secondary" variant="body2">
                Identify yourself to unlock My Items.
              </Typography>
            ) : null}
          </Stack>
        ) : null}

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

        {showMobileCategoryNav ? (
          <Stack spacing={1}>
            <MobileCategoryNav
              activeGroupKey={isSearchActive ? false : (visibleGroupKey ?? false)}
              groups={groupedItemSections}
              onChange={setActiveMobileGroupKey}
            />
            {isSearchActive ? (
              <Typography color="text.secondary" variant="body2">
                Showing matches across all categories while search is active.
              </Typography>
            ) : null}
          </Stack>
        ) : null}

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
        ) : activeTab === 'summary' ? (
          <EventSummaryTable
            emptyMessage={
              isSearchActive
                ? 'No summary rows match that search.'
                : 'No required items are available to summarise yet.'
            }
            items={visibleItems}
            participantsById={participantNamesById}
          />
        ) : visibleItems.length === 0 ? (
          <Card>
            <CardContent>
              <Typography color="text.secondary">
                {activeTab === 'mine'
                  ? isSearchActive
                    ? 'No claimed items match that search.'
                    : "You haven't claimed anything yet."
                  : 'No items match that search.'}
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <ItemList
            categories={visibleCategories}
            isManageMode={manageMode}
            items={visibleItems}
            onAddItem={openContributionForm}
            onClaim={openClaimDialog}
            onDeleteCategory={(category) => openDeleteCategoryDialog(category.id, category.name)}
            onDeleteItem={openDeleteItemDialog}
            onEditCategory={(category) => setCategoryFormState({ category })}
            onEditItem={openItemEditForm}
            onOpenItemDetail={(item) => openItemDetail(item)}
            onMoveCategoryDown={(category) => void handleMoveCategory(category.id, 1)}
            onMoveCategoryUp={(category) => void handleMoveCategory(category.id, -1)}
            participants={data.participants}
            visibleGroupKey={visibleGroupKey}
          />
        )}

        <Box sx={{ pb: isSmallScreen ? 1 : 2 }} />
      </Stack>

      {showItemVisibilityTabs && isSmallScreen ? (
        <Paper
          data-testid="mobile-item-visibility-bar"
          elevation={8}
          sx={{
            backgroundImage: 'none',
            borderRadius: 0,
            borderTop: '1px solid',
            borderColor: 'divider',
            borderTopLeftRadius: 0,
            borderTopRightRadius: 0,
            bottom: 0,
            left: 0,
            position: 'fixed',
            px: 1.5,
            pt: 0.75,
            pb: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
            right: 0,
            zIndex: theme.zIndex.appBar,
          }}
        >
          <Container maxWidth="sm" sx={{ px: 0 }}>
            <Stack spacing={0.75}>
              {!identity ? (
                <Typography align="center" color="text.secondary" sx={{ lineHeight: 1.2, px: 1 }} variant="caption">
                  Identify yourself to unlock My Items.
                </Typography>
              ) : null}
              {itemVisibilityTabs}
            </Stack>
          </Container>
        </Paper>
      ) : null}

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

      <ItemDetailSurface
        currentIdentity={identity}
        isManageMode={manageMode}
        isOpen={Boolean(itemDetailState && selectedDetailItem)}
        item={selectedDetailItem}
        mode={itemDetailState?.mode ?? 'view'}
        onClose={closeItemDetail}
        onDelete={(item) => {
          closeItemDetail()
          openDeleteItemDialog(item)
        }}
        onEdit={(item) => {
          closeItemDetail()
          openItemEditForm(item)
        }}
        onOpenClaim={(item, assignment) => {
          closeItemDetail()
          openClaimDialog(item, assignment)
        }}
        participants={data.participants}
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
        guestParticipantId={itemFormState?.createdByParticipantId ?? null}
        identity={identity}
        initialCategoryId={itemFormState?.categoryId ?? null}
        isOpen={Boolean(itemFormState)}
        item={itemFormState?.item ?? null}
        mode={itemFormState?.mode ?? 'guest-create'}
        onClose={() => setItemFormState(null)}
        onCreate={handleCreateItem}
        onRequireIdentity={() => runWithIdentity(bindIdentityToOpenContributionForm)}
        onUpdate={handleUpdateItem}
      />

      <CategoryForm
        category={categoryFormState?.category ?? null}
        isOpen={Boolean(categoryFormState)}
        onClose={() => setCategoryFormState(null)}
        onSave={handleSaveCategory}
      />

      <ParticipantManagerDialog
        isOpen={isParticipantManagerOpen}
        onClose={() => setIsParticipantManagerOpen(false)}
        onRemoveParticipant={(participant) => openDeleteParticipantDialog(participant.id, participant.name)}
        participants={data.participants}
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
        sx={mobileItemVisibilityBarOffset ? { bottom: `${mobileItemVisibilityBarOffset} !important` } : undefined}
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
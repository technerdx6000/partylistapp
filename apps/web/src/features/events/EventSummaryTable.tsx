import type { EventItemWithAssignments } from '@listcollab/shared'
import {
  Card,
  CardContent,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'

type EventSummaryTableProps = {
  emptyMessage: string
  items: readonly EventItemWithAssignments[]
  participantsById: Map<number, string>
}

type EventSummaryRow = {
  assigneeName: string
  isContribution: boolean
  itemName: string
  key: string
  outstandingQuantity: number | null
  quantity: number
}

function buildSummaryRows(
  items: readonly EventItemWithAssignments[],
  participantsById: Map<number, string>
): EventSummaryRow[] {
  return items.flatMap<EventSummaryRow>((item) => {
    if (item.quantityRequired === null) {
      if (item.assignments.length === 0) {
        return [
          {
            assigneeName: 'Unassigned',
            isContribution: true,
            itemName: item.name,
            key: `${item.id}-contribution-unassigned`,
            outstandingQuantity: null,
            quantity: 0,
          },
        ]
      }

      return item.assignments.map((assignment) => ({
        assigneeName: participantsById.get(assignment.participantId) ?? 'Someone',
        isContribution: true,
        itemName: item.name,
        key: `${item.id}-contribution-${assignment.id}`,
        outstandingQuantity: null,
        quantity: assignment.quantity,
      }))
    }

    const assignmentRows: EventSummaryRow[] = item.assignments.map((assignment) => ({
      assigneeName: participantsById.get(assignment.participantId) ?? 'Someone',
      isContribution: false,
      itemName: item.name,
      key: `${item.id}-assignment-${assignment.id}`,
      outstandingQuantity: item.coverage.remaining ?? 0,
      quantity: assignment.quantity,
    }))

    if ((item.coverage.remaining ?? 0) === 0) {
      return assignmentRows
    }

    return [
      ...assignmentRows,
      {
        assigneeName: 'Unassigned',
        isContribution: false,
        itemName: item.name,
        key: `${item.id}-unassigned`,
        outstandingQuantity: item.coverage.remaining ?? 0,
        quantity: 0,
      },
    ]
  })
}

/**
 * Renders a compact event-wide requirement summary table for quick status checks.
 *
 * @param {EventSummaryTableProps} props - The filtered items, participant names, and empty-state copy.
 * @returns {React.JSX.Element} The rendered event summary view.
 */
export function EventSummaryTable({ emptyMessage, items, participantsById }: EventSummaryTableProps): React.JSX.Element {
  const theme = useTheme()
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const summaryRows = buildSummaryRows(items, participantsById)

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Stack spacing={0.5}>
            <Typography variant="h3">Summary</Typography>
            <Typography color="text.secondary" variant="body2">
              Quick event-wide status by item, assignee, quantity, and remaining quantity.
            </Typography>
          </Stack>

          {summaryRows.length === 0 ? (
            <Typography color="text.secondary">{emptyMessage}</Typography>
          ) : (
            <TableContainer>
              <Table aria-label="Event summary" size="small" sx={{ tableLayout: 'auto', width: '100%' }}>
                <colgroup>
                  <col style={{ width: isSmallScreen ? '36%' : '38%' }} />
                  <col style={{ width: isSmallScreen ? '28%' : '30%' }} />
                  <col style={{ width: isSmallScreen ? '10%' : '10%' }} />
                  <col style={{ width: isSmallScreen ? '26%' : '22%' }} />
                </colgroup>
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{
                        fontSize: isSmallScreen ? '0.72rem' : undefined,
                        overflowWrap: 'break-word',
                        py: 1,
                        verticalAlign: 'bottom',
                        whiteSpace: 'normal',
                      }}
                    >
                      Item
                    </TableCell>
                    <TableCell
                      sx={{
                        fontSize: isSmallScreen ? '0.72rem' : undefined,
                        overflowWrap: 'break-word',
                        py: 1,
                        verticalAlign: 'bottom',
                        whiteSpace: 'normal',
                      }}
                    >
                      Assignee
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        fontSize: isSmallScreen ? '0.72rem' : undefined,
                        py: 1,
                        verticalAlign: 'bottom',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Qty
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        fontSize: isSmallScreen ? '0.72rem' : undefined,
                        overflowWrap: 'break-word',
                        py: 1,
                        verticalAlign: 'bottom',
                        whiteSpace: 'normal',
                      }}
                    >
                      Remaining Qty
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {summaryRows.map((row) => (
                    <TableRow key={row.key}>
                      <TableCell sx={{ overflowWrap: 'anywhere', py: 1.25, verticalAlign: 'top' }}>
                        <Typography fontWeight={600} variant="body2">
                          {row.itemName}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ overflowWrap: 'anywhere', py: 1.25, verticalAlign: 'top' }}>
                        <Typography color={row.assigneeName === 'Unassigned' ? 'text.secondary' : 'text.primary'} variant="body2">
                          {row.assigneeName}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ py: 1.25, verticalAlign: 'top' }}>
                        <Typography variant="body2">{row.quantity}</Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ py: 1.25, verticalAlign: 'top' }}>
                        <Typography color={row.isContribution ? 'text.secondary' : 'text.primary'} variant="body2">
                          {row.outstandingQuantity === null ? '—' : row.outstandingQuantity}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}
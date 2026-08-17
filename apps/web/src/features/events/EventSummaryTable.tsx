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
  itemName: string
  key: string
  outstandingQuantity: number
  quantity: number
}

function buildSummaryRows(
  items: readonly EventItemWithAssignments[],
  participantsById: Map<number, string>
): EventSummaryRow[] {
  return items.flatMap((item) => {
    if (item.quantityRequired === null) {
      return []
    }

    const assignmentRows = item.assignments.map((assignment) => ({
      assigneeName: participantsById.get(assignment.participantId) ?? 'Someone',
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
              Quick event-wide coverage by item, assignee, and remaining quantity.
            </Typography>
          </Stack>

          {summaryRows.length === 0 ? (
            <Typography color="text.secondary">{emptyMessage}</Typography>
          ) : (
            <TableContainer>
              <Table aria-label="Event summary" size="small" sx={{ tableLayout: 'fixed' }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: isSmallScreen ? '35%' : '36%' }}>What Item</TableCell>
                    <TableCell sx={{ width: isSmallScreen ? '31%' : '32%' }}>Who it's assigned to</TableCell>
                    <TableCell align="right" sx={{ width: '14%' }}>
                      Quantity
                    </TableCell>
                    <TableCell align="right" sx={{ width: isSmallScreen ? '20%' : '18%' }}>
                      Outstanding quantity
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
                        <Typography variant="body2">{row.outstandingQuantity}</Typography>
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
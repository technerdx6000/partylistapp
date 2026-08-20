import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import FolderOpenRoundedIcon from '@mui/icons-material/FolderOpenRounded'
import { Box, Stack, Tab, Tabs, Typography } from '@mui/material'

import { getCategoryCoverageSummary } from './eventCoverage'
import { renderCategoryIcon } from '../categories/categoryIcons'
import type { GroupedItemsByCategory } from '../items/groupItemsByCategory'

type MobileCategoryNavProps = {
  activeGroupKey: string | false
  groups: readonly GroupedItemsByCategory[]
  onChange: (groupKey: string) => void
}

function getItemCountLabel(group: GroupedItemsByCategory): string {
  const coverageSummary = getCategoryCoverageSummary(group.items)

  return `${coverageSummary.readyItems} of ${coverageSummary.totalItems} items ready`
}

function getCompactItemCountLabel(group: GroupedItemsByCategory): string {
  const coverageSummary = getCategoryCoverageSummary(group.items)

  return `${coverageSummary.readyItems}/${coverageSummary.totalItems}`
}

/**
 * Renders the compact sticky category navigation used on phone-sized event pages.
 *
 * @param {MobileCategoryNavProps} props - The category groups, current selection, and change handler.
 * @returns {React.JSX.Element} The mobile category navigation tabs.
 */

export function MobileCategoryNav({ activeGroupKey, groups, onChange }: MobileCategoryNavProps): React.JSX.Element {
  return (
    <Box
      sx={{
        backdropFilter: 'blur(14px)',
        bgcolor: 'background.default',
        borderRadius: 3,
        position: 'sticky',
        top: 12,
        zIndex: 2,
      }}
    >
      <Tabs
        allowScrollButtonsMobile
        aria-label="Category navigation"
        onChange={(_event, nextValue: string) => onChange(nextValue)}
        scrollButtons="auto"
        sx={{
          minHeight: 0,
          px: 0.5,
          '& .MuiTabs-indicator': {
            borderRadius: 999,
            height: 3,
          },
        }}
        value={activeGroupKey}
        variant="scrollable"
      >
        {groups.map((group) => {
          const label = group.category?.name ?? 'Uncategorised'
          const itemCountLabel = getItemCountLabel(group)

          return (
            <Tab
              aria-label={`${label}, ${itemCountLabel}`}
              key={group.key}
              label={
                <Stack spacing={0.5} sx={{ alignItems: 'flex-start', minWidth: 0 }}>
                  <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
                    <Box aria-hidden="true" component="span" sx={{ display: 'inline-flex', flexShrink: 0 }}>
                      {group.category ? renderCategoryIcon(group.category.icon) : <FolderOpenRoundedIcon fontSize="small" />}
                    </Box>
                    <Typography sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }} variant="body2">
                      {label}
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                    <CheckCircleRoundedIcon fontSize="inherit" />
                    <Box component="span" sx={{ bgcolor: 'action.hover', borderRadius: 999, px: 0.75, py: 0.125 }}>
                      <Typography color="text.secondary" variant="caption">
                        {getCompactItemCountLabel(group)}
                      </Typography>
                    </Box>
                  </Stack>
                </Stack>
              }
              sx={{
                alignItems: 'flex-start',
                minHeight: 64,
                minWidth: 104,
                px: 1.25,
                py: 0.75,
                textTransform: 'none',
              }}
              value={group.key}
            />
          )
        })}
      </Tabs>
    </Box>
  )
}
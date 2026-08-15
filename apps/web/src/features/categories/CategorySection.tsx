import type { EventCategory, EventItemWithAssignments, EventParticipant } from '@listcollab/shared'
import FolderOpenRoundedIcon from '@mui/icons-material/FolderOpenRounded'
import { Stack, Typography } from '@mui/material'

import { ItemRow } from '../items/ItemRow'

type CategorySectionProps = {
  category: EventCategory | null
  items: readonly EventItemWithAssignments[]
  participants: readonly EventParticipant[]
}

export function CategorySection({ category, items, participants }: CategorySectionProps): React.JSX.Element {
  const icon = category?.icon ?? '•'
  const name = category?.name ?? 'Uncategorised'

  return (
    <Stack spacing={1.5}>
      <Typography variant="h3">
        <Stack component="span" direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography component="span">{category ? icon : <FolderOpenRoundedIcon fontSize="small" />}</Typography>
          <Typography component="span" variant="inherit">
            {name}
          </Typography>
        </Stack>
      </Typography>
      <Stack spacing={1.25}>
        {items.map((item) => (
          <ItemRow item={item} key={item.id} participants={participants} />
        ))}
      </Stack>
    </Stack>
  )
}
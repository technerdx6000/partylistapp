import { useQuery } from '@tanstack/react-query'

import { useApiClient } from '../services/apiClient'

export function useEvent(shareToken: string, preferAdmin: boolean) {
  const apiClient = useApiClient(shareToken, preferAdmin)

  return useQuery({
    queryKey: ['event', shareToken],
    queryFn: () => apiClient.getEvent(shareToken),
    enabled: shareToken.length > 0,
  })
}
import type { GetGraphControllerResponse } from '@/types/graph'
import pfRequest from '..'

export function getGraphData(searchQuery?: string) {
  return pfRequest.get({
    url: `/api/graph?searchQuery=${searchQuery}`
  }) as Promise<GetGraphControllerResponse>
}

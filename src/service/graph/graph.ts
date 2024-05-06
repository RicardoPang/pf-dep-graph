import type { GetGraphControllerResponse } from '@/types/graph'
import pfRequest from '..'

export function getGraphData(q?: string) {
  return pfRequest.get({
    url: `/api/graph?q=${q}`
  }) as Promise<GetGraphControllerResponse>
}

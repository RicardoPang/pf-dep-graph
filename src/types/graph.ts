export interface Response<T> {
  code: number
  data: T
  message?: string
}

export interface IGraphProps {
  source: string
  target: string
  value: number
}

export interface INodeArrayProps {
  id: string
  group: number
}

export type GetGraphControllerResponse = Response<{
  graph: IGraphProps[]
  nodeArray: INodeArrayProps[]
}>

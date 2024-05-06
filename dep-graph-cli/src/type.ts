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

export interface IGetGraphControllerParams {
  // 搜索内容
  q?: string
}

export type GetGraphControllerResponse = Response<{
  // 图形数据
  graph: IGraphProps[]
  // 节点数据
  nodeArray: INodeArrayProps[]
}>

export interface IGetGrapDataOptions {
  // 依赖包
  pkg: IDepOptions
  // 递归深度
  depth?: number
  // 搜索内容
  q?: string
}

export interface IDepOptions {
  dependencies?: IDependencies
  devDependencies?: IDependencies
}

export interface IGraphData {
  graph: IGraphProps[]
  nodeArray: INodeArrayProps[]
}

export interface ICheckFileResult {
  // 检查结果
  status: boolean
  // 子路径
  childPath?: string
}

export type PackageName = string | undefined

export interface IDependencies {
  [key: string]: string
}

export interface IGraphData {
  graph: IGraphProps[]
  nodeArray: INodeArrayProps[]
}

export interface IBuildGraphOptions {
  // 依赖包路径
  pkgDir: string
  // 依赖包名称
  source: PackageName
  // 依赖包
  dependencies: IDependencies
  // 递归深度
  depth?: number
  // 节点类型
  typeCounter?: number
  // 搜索内容
  q?: string
}

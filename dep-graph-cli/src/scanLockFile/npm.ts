import {
  IGraphData,
  IGraphProps,
  ILockFileOptions,
  INodeArrayProps
} from '../type'
import { baseDepGraph } from './base'

interface IPackageLock {
  packages: {
    [path: string]: {
      version: string
      dependencies?: { [packageName: string]: string }
      optionalDependencies?: { [packageName: string]: string }
      peerDependencies?: { [packageName: string]: string }
      dev?: boolean
      peer?: boolean
      name?: string
    }
  }
}

export class NpmLockGraph extends baseDepGraph {
  // 依赖包内容
  private content: any

  constructor(options: ILockFileOptions) {
    super()
    const { content } = options
    this.content = content
  }

  // 解析依赖图
  async parse(): Promise<IGraphData> {
    // 解析为JSON对象
    const parsedLock = JSON.parse(this.content) as IPackageLock
    // 结构获取packages对象
    const { packages } = parsedLock

    // 初始化依赖图
    const graph: IGraphProps[] = []
    // 使用Map确保节点数组中包名唯一
    const nodeArrayMap: Map<string, INodeArrayProps> = new Map()

    for (const [pkgPath, pkgDetails] of Object.entries(packages)) {
      if (!pkgPath) continue

      // 从路径提取包名, 去掉node_modules前缀
      const pkgName = pkgPath.replace(/^node_modules\//, '')
      // 如果不存在 将包名添加到节点数组
      if (!nodeArrayMap.has(pkgName)) {
        nodeArrayMap.set(pkgName, {
          id: pkgName
        })
      }

      // 统一遍历所有类型的依赖关系
      for (const [depName] of Object.entries({
        ...pkgDetails.dependencies,
        ...pkgDetails.optionalDependencies,
        ...pkgDetails.peerDependencies
      })) {
        // 把依赖关系添加到依赖图中
        graph.push({
          source: pkgName, // 依赖来源是当前包名
          target: depName
        })
        // 确保依赖包也在节点数组中
        if (!nodeArrayMap.has(depName)) {
          nodeArrayMap.set(depName, {
            id: depName
          })
        }
      }
    }

    const nodeArray = Array.from(nodeArrayMap.values())

    return {
      graph,
      nodeArray
    }
  }
}

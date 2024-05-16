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
      devDependencies?: { [packageName: string]: string }
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

    // 统一遍历所有类型的依赖关系
    const addDependencies = (
      pkgName: string,
      dependencies?: { [packageName: string]: string }
    ) => {
      if (dependencies) {
        for (const depName of Object.keys(dependencies)) {
          graph.push({
            source: pkgName,
            target: depName
          })
          if (!nodeArrayMap.has(depName)) {
            nodeArrayMap.set(depName, {
              id: depName
            })
          }
        }
      }
    }

    // 遍历所有包
    for (const [pkgPath, pkgDetails] of Object.entries(packages)) {
      // 如果路径为空，表示是项目自身
      const pkgName = pkgPath
        ? pkgPath.replace(/^node_modules\//, '')
        : parsedLock.packages[''].name

      // 确保节点数组中包含当前包
      if (!nodeArrayMap.has(pkgName!)) {
        nodeArrayMap.set(pkgName!, {
          id: pkgName!
        })
      }

      // 处理所有类型的依赖关系
      addDependencies(pkgName!, pkgDetails.dependencies)
      addDependencies(pkgName!, pkgDetails.optionalDependencies)
      addDependencies(pkgName!, pkgDetails.peerDependencies)
      if (!pkgPath) {
        // 顶层对象需要解析 devDependencies
        addDependencies(pkgName!, pkgDetails.devDependencies)
      }
    }

    const nodeArray = Array.from(nodeArrayMap.values())

    return {
      graph,
      nodeArray
    }
  }
}

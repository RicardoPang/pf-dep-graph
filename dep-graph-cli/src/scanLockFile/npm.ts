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

    // 初始化依赖图和节点数组
    const graph: IGraphProps[] = []
    const nodeArray: INodeArrayProps[] = []

    for (const [pkgPath, pkgDetails] of Object.entries(packages)) {
      if (!pkgPath) continue

      // 从路径提取包名, 去掉node_modules前缀
      const pkgName = pkgPath.replace(/^node_modules\//, '')
      // 将包名添加到节点数组
      nodeArray.push({
        id: pkgName
      })

      // 如果包有依赖, 继续处理
      if (pkgDetails.dependencies) {
        for (const [depName] of Object.entries(pkgDetails.dependencies)) {
          // 构建依赖路径
          const depPath = `node_modules/${depName}`
          // 把依赖关系添加到依赖图中
          graph.push({
            source: pkgName, // 依赖来源是当前包名
            target: depPath.replace(/^node_modules\//, '')
          })
        }
      }
    }

    return {
      graph,
      nodeArray
    }
  }
}

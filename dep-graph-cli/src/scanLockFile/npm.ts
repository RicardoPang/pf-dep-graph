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

  async parse(): Promise<IGraphData> {
    const parsedLock = JSON.parse(this.content) as IPackageLock
    const { packages } = parsedLock

    // 初始化graph和nodeArray
    const graph: IGraphProps[] = []
    const nodeArray: INodeArrayProps[] = []

    for (const [pkgPath, pkgDetails] of Object.entries(packages)) {
      if (!pkgPath) continue

      const pkgName = pkgPath.replace(/^node_modules\//, '')
      nodeArray.push({
        id: pkgName
      })

      if (pkgDetails.dependencies) {
        for (const [depName] of Object.entries(pkgDetails.dependencies)) {
          const depPath = `node_modules/${depName}`
          graph.push({
            source: pkgName,
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

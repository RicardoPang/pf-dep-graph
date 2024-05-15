// 解析pnpm工具
import { readWantedLockfile } from '@pnpm/lockfile-file'
import {
  IGraphData,
  IGraphProps,
  ILockFileOptions,
  INodeArrayProps
} from '../type'
import { baseDepGraph } from './base'

// 解析报名和版本信息
const parseFromSpecify = (specifier: string) => {
  // 正则: 匹配pnpm文件的包描述
  // /@vue/cli-service/4.5.13_vue@cli-service@4.5.13
  // 全局作用域@vue 包名cli-service 版本4.5.13 额外_vue@cli-service@4.5.13
  const REGEXP = /^\/(@?[\w\-\d\.]+(\/[\w\-\d\.]+)?)\/(([\d\w\.\-]+)(.+)?)/
  const match = specifier.match(REGEXP)
  if (match) {
    const [, name, , localVersion, version] = match
    return {
      name, // 包名
      specifier, // 完整描述
      localVersion, // 本地版本
      version // 版本
    }
  }
  return {
    name: '',
    specifier,
    localVersion: '',
    version: ''
  }
}

export class PnpmLockGraph extends baseDepGraph {
  private lockPath: string // 锁文件路径

  constructor(options: ILockFileOptions) {
    super()
    const { lockPath } = options
    this.lockPath = lockPath
  }

  // 解析依赖图
  async parse(): Promise<IGraphData> {
    // 从锁文件读取数据
    // readWantedLockfile读取pnpm-lock.yaml文件 返回imporers(项目导入者 多个项目工作区)和packages(所有包的依赖关系和版本信息)
    const { importers, packages } =
      (await readWantedLockfile(
        this.lockPath.slice(0, this.lockPath.lastIndexOf('/')),
        {
          ignoreIncompatible: true // 忽略不兼容的版本
        }
      )) || {}

    // 初始化依赖图和节点数组
    const graph: IGraphProps[] = []
    const nodeArray: INodeArrayProps[] = []

    // 存储所有出现过的节点
    const nodeSet = new Set<string>()

    // 处理导入依赖
    if (importers) {
      for (const [
        importerName,
        { dependencies, devDependencies }
      ] of Object.entries(importers)) {
        nodeSet.add(importerName) // 添加导入节点

        for (const [depName] of Object.entries({
          ...dependencies,
          ...devDependencies
        })) {
          graph.push({
            source: importerName, // 依赖源
            target: depName // 依赖目标
          })
          nodeSet.add(depName) // 添加依赖节点
        }
      }
    }

    // 处理包依赖
    if (packages) {
      for (const [specifier, packageInfo] of Object.entries(packages)) {
        const { name } = parseFromSpecify(specifier)
        nodeSet.add(name) // 添加包节点
        for (const [depName] of Object.entries({
          ...packageInfo.dependencies,
          ...packageInfo.peerDependencies
        })) {
          graph.push({
            source: name, // 依赖源
            target: depName // 依赖目标
          })
          nodeSet.add(depName) // 添加依赖节点
        }
      }
    }

    // 转节点数组
    nodeArray.push(
      ...Array.from(nodeSet).map((id) => ({
        id
      }))
    )

    return {
      graph,
      nodeArray
    }
  }
}

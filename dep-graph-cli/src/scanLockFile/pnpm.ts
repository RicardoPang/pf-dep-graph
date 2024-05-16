// 解析pnpm工具
import { readWantedLockfile } from '@pnpm/lockfile-file'
import {
  IGraphData,
  IGraphProps,
  ILockFileOptions,
  INodeArrayProps,
  IPackageInfo
} from '../type'
import { baseDepGraph } from './base'

// 解析报名和版本信息
const parseFromSpecify = (specifier: string): IPackageInfo => {
  // 正则: 匹配pnpm文件的包描述
  const REGEXP = /^\/(@?[\w\-./]+)\/([\w\-./]+)$/
  const match = specifier.match(REGEXP)
  if (match) {
    const [, name, version] = match
    return {
      name, // 包名
      specifier, // 完整描述
      version // 版本
    }
  }
  return {
    name: '',
    specifier,
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
    const lockfileData = await readWantedLockfile(
      this.lockPath.slice(0, this.lockPath.lastIndexOf('/')),
      {
        ignoreIncompatible: true // 忽略不兼容的版本
      }
    )
    if (!lockfileData) {
      throw new Error('读取pnpm-lock.yaml文件失败')
    }

    const { importers, packages } = lockfileData

    // 初始化依赖关系
    const graph: IGraphProps[] = []
    // 存储所有出现过的节点
    const nodeSet = new Set<string>()

    // 处理导入依赖
    if (importers) {
      for (const [
        importerName,
        { dependencies = {}, devDependencies = {}, optionalDependencies = {} }
      ] of Object.entries(importers)) {
        nodeSet.add(importerName) // 添加导入节点

        for (const [depName] of Object.entries({
          ...dependencies,
          ...devDependencies,
          ...optionalDependencies
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
        if (!name) continue

        nodeSet.add(name) // 添加包节点

        for (const [depName] of Object.entries({
          ...packageInfo.dependencies, // 运行时依赖 必需
          ...packageInfo.peerDependencies, // 外部包 已被项目使用者安装
          ...packageInfo.optionalDependencies // 可选依赖 可选
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
    const nodeArray: INodeArrayProps[] = Array.from(nodeSet).map((id) => ({
      id
    }))

    return {
      graph,
      nodeArray
    }
  }
}

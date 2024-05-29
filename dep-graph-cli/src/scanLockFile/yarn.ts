// 解析yarn工具
import * as lockfile from '@yarnpkg/lockfile'
import {
  IGraphData,
  IGraphProps,
  ILockFileOptions,
  INodeArrayProps,
  IPackageInfo
} from '../type'
import { baseDepGraph } from './base'

interface IYarnFileEntry {
  version: string
  resolved?: string
  integrity?: string
  dependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
}

// {@antfu/utils@^0.7.6: {…}, @antfu/utils@^0.7.8: {…}, @babel/code-frame@^7.0.0: {…}}
// 'yargs@^17.0.0': { version: '17.7.2', dependencies: {} }
const parseFromSpecify = (specifier: string): IPackageInfo => {
  // 正则: 匹配yarn文件的包描述
  // @scope/package@version 第一个捕获作用域包名 第二个捕获version
  // package@version 第一个捕获包名 第二个捕获version
  const REGEXP = /^((?:@[^/]+\/)?[^@/]+)@(.+)$/
  const match = specifier.match(REGEXP)
  // 匹配成功, 返回包名、版本信息
  if (match) {
    let [, name, version] = match
    version = version.replace(/^\^/, '')
    return {
      name,
      specifier,
      version
    }
  }
  return {
    name: '',
    specifier,
    version: ''
  }
}

export class YarnLockGraph extends baseDepGraph {
  private content: string // lock file 内容

  constructor(options: ILockFileOptions) {
    super()
    this.content = options.content
  }

  async parse(): Promise<IGraphData> {
    // 使用yarn工具解析yarn.lock
    const parsedYarnFile = lockfile.parse(this.content)
    if (parsedYarnFile.type !== 'success') {
      throw new Error('解析yarn.lock文件失败')
    }

    // 初始化依赖图和节点数组
    const graph: IGraphProps[] = []
    const nodeSet = new Set<string>()

    // lock file 报数据
    const packages = parsedYarnFile.object as Record<string, IYarnFileEntry>

    for (const [key, value] of Object.entries(packages)) {
      // 解析包名
      const { name } = parseFromSpecify(key)
      // 如果包名解析失败 跳过
      if (!name) continue

      // 添加节点
      nodeSet.add(name)

      // 如果包有依赖, 添加依赖关系到图中
      if (value.dependencies) {
        for (const [depName] of Object.entries({
          ...value.dependencies,
          ...value.peerDependencies,
          ...value.optionalDependencies
        })) {
          graph.push({
            source: name,
            target: depName
          })
          // 通用添加依赖的包到节点
          nodeSet.add(depName)
        }
      }
    }

    const nodeArray: INodeArrayProps[] = Array.from(nodeSet).map((id) => ({
      id
    }))

    return {
      graph,
      nodeArray
    }
  }
}

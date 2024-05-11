import * as lockfile from '@yarnpkg/lockfile'
import {
  IDepOptions,
  IGraphData,
  IGraphProps,
  ILockFileOptions,
  INodeArrayProps
} from '../type'
import { baseDepGraph } from './base'

interface IYarnFileEntry {
  version: string
  resolved?: string
  integrity?: string
  dependencies?: Record<string, string>
}

const parseFromSpecify = (specifier: string) => {
  const REGEXP = /^((?:@[^/]+\/)?[^@/]+)@(.+)$/
  const match = specifier.match(REGEXP)
  if (match) {
    const [, name, , localVersion, version] = match
    return {
      name,
      specifier,
      localVersion,
      version
    }
  }
  return {
    name: '',
    specifier,
    localVersion: '',
    version: ''
  }
}

export class YarnLockGraph extends baseDepGraph {
  private content: string

  constructor(options: ILockFileOptions) {
    super()
    this.content = options.content
  }

  async parse(): Promise<IGraphData> {
    const parsedYarnFile = lockfile.parse(this.content)
    if (parsedYarnFile.type !== 'success') {
      throw new Error('解析yarn.lock文件失败')
    }

    const graph: IGraphProps[] = []
    const nodeSet = new Set<string>()
    const packages = parsedYarnFile.object as Record<string, IYarnFileEntry>

    for (const [key, value] of Object.entries(packages)) {
      const { name } = parseFromSpecify(key)
      nodeSet.add(name)

      if (value.dependencies) {
        for (const [depName] of Object.entries(value.dependencies)) {
          graph.push({
            source: name,
            target: depName
          })
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

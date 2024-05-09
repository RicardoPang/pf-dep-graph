import { readWantedLockfile } from '@pnpm/lockfile-file'
import {
  IGraphData,
  IGraphProps,
  ILockFileOptions,
  INodeArrayProps
} from '../type'
import { baseDepGraph } from './base'

const parseFromSpecify = (specifier: string) => {
  const REGEXP = /^\/(@?[\w\-\d\\.]+(\/[\w\-\d\\.]+)?)\/(([\d\w\\.\\-]+)(.+)?)/
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

export class PnpmLockGraph extends baseDepGraph {
  private lockPath: string

  constructor(options: ILockFileOptions) {
    super()
    const { lockPath } = options
    this.lockPath = lockPath
  }

  async parse(): Promise<IGraphData> {
    const { importers, packages } =
      (await readWantedLockfile(
        this.lockPath.slice(0, this.lockPath.lastIndexOf('/')),
        {
          ignoreIncompatible: true
        }
      )) || {}

    // 初始化graph和nodeArray
    const graph: IGraphProps[] = []
    const nodeArray: INodeArrayProps[] = []

    const nodeSet = new Set<string>()

    if (importers) {
      for (const [
        importerName,
        { dependencies, devDependencies }
      ] of Object.entries(importers)) {
        nodeSet.add(importerName)

        for (const [depName] of Object.entries({
          ...dependencies,
          ...devDependencies
        })) {
          graph.push({
            source: importerName,
            target: depName,
            value: 1
          })
          nodeSet.add(depName)
        }
      }
    }

    if (packages) {
      for (const [specifier, packageInfo] of Object.entries(packages)) {
        const { name } = parseFromSpecify(specifier)
        nodeSet.add(name)
        for (const [depName] of Object.entries({
          ...packageInfo.dependencies,
          ...packageInfo.peerDependencies
        })) {
          graph.push({
            source: name,
            target: depName
          })
          nodeSet.add(depName)
        }
      }
    }

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

import {
  IGraphProps,
  INodeArrayProps,
  IGetGrapDataOptions,
  IDepOptions,
  ICheckFileResult,
  IBuildGraphOptions
} from './type'
import { isArray, isObject } from './utils'
import * as path from 'path'
import * as fs from 'fs/promises'

export class DependencyGraphBuilder {
  private visited: Set<string> = new Set()
  // 最大递归深度
  private maxDepth: number = 0

  constructor(private pkgDir: string) {
    this.pkgDir = pkgDir
  }

  /**
   * 获取依赖包及其依赖项的图形数据
   * @param options 包含查询,包,深度
   * @returns 图形数据
   */
  public async getGraphData(options: IGetGrapDataOptions) {
    const { searchQuery, pkg, depth } = options

    if (isObject(pkg) && !isArray(pkg)) {
      const allDeps = this.getDependency(pkg)
      this.visited.clear()
      this.maxDepth = depth ?? 2

      const graphData = await this.buildGraph({
        pkgDir: this.pkgDir,
        source: undefined,
        dependencies: allDeps,
        depth: 0,
        typeCounter: 1,
        searchQuery
      })

      return this.removeDuplicates(graphData.graph, graphData.nodeArray)
    }

    throw new Error('依赖包无效')
  }

  private getDependency(pkg: IDepOptions) {
    return {
      ...pkg.dependencies,
      ...pkg.devDependencies
    }
  }

  /**
   * 构建依赖关系图
   * @param pkgDir 依赖包路径
   * @param source 依赖包名称
   * @param dependencies 依赖包依赖
   * @param depth 递归深度
   * @param typeCounter 节点类型
   * @param q 搜索关键字
   * @returns 构建后的图
   */
  private async buildGraph({
    pkgDir,
    source,
    dependencies,
    depth = 0,
    typeCounter = 1,
    searchQuery
  }: IBuildGraphOptions): Promise<{
    graph: IGraphProps[]
    nodeArray: INodeArrayProps[]
  }> {
    // 情况visited
    this.visited.clear()

    // 初始化graph和nodeArray
    const graph: IGraphProps[] = []
    const nodeArray: INodeArrayProps[] = []

    // 设置跳出递归条件 超过将当前层的graph和nodeArray返回给调用者
    if (depth > this.maxDepth) {
      return { graph, nodeArray }
    }
    // 遍历当前层依赖项
    for (const dep in dependencies) {
      // 格式化
      const curDep = dep + dependencies[dep].replace('^', '@')

      // 检查已访问集合，可能跳过依赖项
      if (this.visited.has(curDep)) {
        continue
      }
      this.visited.add(curDep)

      // 查询对应的搜索条件
      if (searchQuery == dep) {
        nodeArray.push({ id: dep, group: typeCounter })
      }
      // 没有传入参数, 传入参数且传入参数与父依赖相同
      if (searchQuery === undefined || searchQuery === source) {
        // 将依赖加入图
        if (source) {
          graph.push({
            source,
            target: dep,
            value: typeCounter
          })
        }
        nodeArray.push({ id: dep, group: typeCounter })
      }

      // 实际文件夹路径
      const depPkgPath = this.getDepPkgPath(pkgDir, dep)
      const { status, childPath } = await this.checkFile(depPkgPath)
      if (!status) {
        continue
      }
      const depPkg = await fs.readFile(depPkgPath, 'utf-8')
      if (!depPkg) {
        continue
      }

      // 获取子依赖dependencies
      const childDeps = this.getDependency(JSON.parse(depPkg))
      // 递归调用buildGraph(下一层)
      const childGraphResult = await this.buildGraph({
        pkgDir: childPath!,
        source: dep,
        dependencies: childDeps,
        depth: depth + 1,
        typeCounter: typeCounter,
        searchQuery: searchQuery === dep ? dep : searchQuery
      })

      // 合并下一层返回的graph和nodeArray到当前层 确保当前层的数据包含了下一层的结果
      nodeArray.push(...childGraphResult.nodeArray)
      graph.push(...childGraphResult.graph)

      typeCounter++
    }

    // 返回当前层的graph和nodeArray到上一层调用者
    return { graph, nodeArray }
  }

  /**
   * 检查指定路径的文件是否存在且它是一个文件
   * @param depPkgPath 要检查的路径
   * @returns 返回对象,包含状态和子路径
   */
  private async checkFile(depPkgPath: string): Promise<ICheckFileResult> {
    try {
      const stats = await fs.stat(depPkgPath)
      // 检查是否是文件
      if (stats.isFile()) {
        return { status: true, childPath: depPkgPath }
      } else {
        // 如果不是文件，返回错误
        console.error(`路径不是一个文件: ${depPkgPath}`)
        return { status: false }
      }
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        console.error(`文件未找到: ${depPkgPath}`)
      } else {
        console.error(`检查文件出错: ${err.message}`)
      }
      return { status: false }
    }
  }

  // 去重
  private removeDuplicates(graph: IGraphProps[], nodeArray: INodeArrayProps[]) {
    const uniqueGraph = Array.from(
      new Map(graph.map((item) => [item.source + item.target, item])).values()
    )
    const uniqueNodeArray = Array.from(
      new Map(nodeArray.map((item) => [item.id, item])).values()
    )
    return { graph: uniqueGraph, nodeArray: uniqueNodeArray }
  }

  // 获取依赖文件夹路径
  private getDepFolderPath(baseDir: string, dep: string) {
    // 两种方式
    // 读 node_modules 里面的 packages 的目录/文件，找出依赖关系(当前)
    // 解析 lock file，需要兼容 npm/yarn/pnpm
    const nodeModulesDir = baseDir.includes('node_modules')
      ? baseDir.substring(
          0,
          baseDir.indexOf('node_modules') + 'node_modules'.length
        )
      : path.join(path.dirname(require.resolve(baseDir)), 'node_modules')

    return path.join(nodeModulesDir, dep)
  }

  // 获取依赖包路径
  private getDepPkgPath(baseDir: string, dependency: string): string {
    return path.join(this.getDepFolderPath(baseDir, dependency), 'package.json')
  }
}

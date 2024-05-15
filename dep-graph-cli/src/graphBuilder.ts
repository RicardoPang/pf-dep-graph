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
  // 记录已访问过的依赖, 避免重复处理
  private visited: Set<string> = new Set()
  // 最大递归深度, 限制依赖搜索的深度
  private maxDepth: number = 0

  constructor(private pkgDir: string) {
    // 接收包目录路径
    this.pkgDir = pkgDir
  }

  /**
   * 获取依赖包及其依赖项的图形数据
   * @param options 查询条件, 包含查询条件, 包信息, 深度
   * @returns 图形数据, 包含依赖关系图和节点数组
   */
  public async getGraphData(options: IGetGrapDataOptions) {
    const { searchQuery, pkg, depth } = options

    if (isObject(pkg) && !isArray(pkg)) {
      const allDeps = this.getDependency(pkg) // 获取所有依赖项
      this.visited.clear() // 清空已访问依赖项
      this.maxDepth = depth ?? 2 // 设置最大递归深度, 默认为 2

      // 构建依赖关系图
      const graphData = await this.buildGraph({
        pkgDir: this.pkgDir,
        source: undefined, // 当前源依赖未定义
        dependencies: allDeps,
        depth: 0, // 初始化深度为 0
        typeCounter: 1,
        searchQuery
      })

      // 返回去重后的数据
      return this.removeDuplicates(graphData.graph, graphData.nodeArray)
    }

    // 传入的依赖包不是有效的对象
    throw new Error('依赖包无效')
  }

  // 获取依赖项, 包括生产依赖和开发依赖
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
   * @param typeCounter 节点类型计数器, 用于分组
   * @param q 搜索查询条件
   * @returns 构建后的依赖关系图和节点数组
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
    // 清空已访问记录
    this.visited.clear()

    // 初始化依赖关系图和节点数组
    const graph: IGraphProps[] = []
    const nodeArray: INodeArrayProps[] = []

    // 如果以达到最大递归深度, 停止递归并返回当前结果
    if (depth > this.maxDepth) {
      return { graph, nodeArray }
    }

    // 遍历当前层依赖项
    for (const dep in dependencies) {
      // 格式化依赖项名称
      const curDep = dep + dependencies[dep].replace('^', '@')

      // 检查是否已处理过该依赖项, 如果是, 则跳过
      if (this.visited.has(curDep)) {
        continue
      }
      this.visited.add(curDep) // 标记为已处理

      // 如果搜索条件匹配当前依赖项就添加到节点数组
      if (searchQuery == dep) {
        nodeArray.push({ id: dep, group: typeCounter })
      }
      // 如果没有搜索条件或搜索条件与源依赖相同, 则处理当前依赖项
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
      // stat描述文件或目录的信息, 如大小、修改时间等
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
    // 使用Map结构去重数组
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
    // 判断baseDir是否已经是node_modules路径, 如果是直接用
    // 否则解析相对路径获取node_modules目录
    const nodeModulesDir = baseDir.includes('node_modules')
      ? baseDir.substring(
          0,
          baseDir.indexOf('node_modules') + 'node_modules'.length
        )
      : path.join(path.dirname(require.resolve(baseDir)), 'node_modules')

    // 拼接获取以来的实际路径
    return path.join(nodeModulesDir, dep)
  }

  // 获取依赖包路径
  private getDepPkgPath(baseDir: string, dependency: string): string {
    // 获取依赖文件夹路径, 并拼接package.json获取完整依赖包json文件路径
    return path.join(this.getDepFolderPath(baseDir, dependency), 'package.json')
  }
}

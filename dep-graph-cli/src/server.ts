import Koa from 'koa'
import { Context } from 'koa'
import Router from 'koa-router'
import logger from 'koa-pino-logger'
import {
  CLIENT_PORT,
  HEADERS,
  PORT,
  getProjectLockFile,
  getProjectPakcageJson,
  getQueryParam,
  readPkgPath,
  saveJsonToFile
} from './utils'
import { errorCatch } from './middlewares/errorCatch'
import {
  GetGraphControllerResponse,
  IGraphProps,
  ILockFileOptions,
  ILockFileParser,
  INodeArrayProps
} from './type'
import { DependencyGraphBuilder } from './graphBuilder'
import open from 'open'
import { PnpmLockGraph } from './scanLockFile/pnpm'
import { YarnLockGraph } from './scanLockFile/yarn'
import { NpmLockGraph } from './scanLockFile/npm'

// 开启服务器
export const startServer = async (
  depth: number,
  json: string,
  isParseLockFile: boolean
) => {
  debugger
  // 解析锁文件(isParseLockFile 为 true)
  if (isParseLockFile) {
    // 定义不同锁文件类型对应的处理类
    const lockFileClasses = {
      'pnpm-lock.yaml': PnpmLockGraph,
      'yarn.lock': YarnLockGraph,
      'package-lock.json': NpmLockGraph
    }
    // 获取锁文件信息
    const lockFileInfo = await getProjectLockFile()
    if (lockFileInfo) {
      const { name, content, lockPath } = lockFileInfo
      // 根据锁文件名选择对应的处理类
      const LockGraphClass = lockFileClasses[name]
      // 处理锁文件
      await processLockFile(
        LockGraphClass,
        { name, content, lockPath },
        json,
        isParseLockFile
      )
    } else {
      console.error('没有找到 lock file')
      process.exit(1)
    }
  } else {
    // 读 node_modules 里面的 packages 的目录/文件，找出依赖关系
    if (json) {
      generateAndSaveGraph(depth, json)
    } else {
      startApiServer(depth, null, isParseLockFile)
    }
  }
}

// 处理解析LockFile的共通部分
async function processLockFile(
  lockFileClass: ILockFileParser,
  lockFileInfo: ILockFileOptions,
  json: string,
  isParseLockFile: boolean
) {
  // 创建实例并解析lockFile
  const lockParser = new lockFileClass(lockFileInfo)
  const lockData = await lockParser.parse()

  // 根据json参数选择保存数据到文件或启动API服务器
  if (json) {
    await saveJsonToFile(JSON.stringify(lockData), json)
  } else {
    startApiServer(null, lockData, isParseLockFile)
  }
}

// 启动服务器并提供API
const startApiServer = async (
  depth?: number | null, // depth 执行依赖树深度 可选参数
  lockData?: any, // lockData 解析后的锁文件数据 可选参数
  isParseLockFile: boolean = false // isParseLockFile 是否解析锁文件
) => {
  // 创建 Koa 和 路由实例
  const app = new Koa()
  const router = new Router()

  // 中间件处理所有通过Koa Router的请求
  app.use(async (ctx: Context, next: () => Promise<void>) => {
    console.log(`Process ${ctx.request.method} ${ctx.request.url}...`)
    ctx.set(HEADERS) // 设置响应头
    ctx.set('Access-Control-Allow-Origin', '*') // 允许跨域
    ctx.set('Access-Control-Allow-Headers', '*') // 允许所有请求头
    // 预检请求
    if (ctx.request.method === 'OPTIONS') {
      ctx.status = 200
      ctx.body = 'success'
      return
    }
    await next()
  })

  // 使用中间件
  app.use(logger()) // 打印请求日志
  app.use(errorCatch()) // 捕获错误并返回错误信息

  // 定义API路由
  router.get('/api/graph', async (ctx: Context, next: () => Promise<void>) => {
    try {
      // 获取搜索关键字
      const searchQuery = getQueryParam(ctx.query, 'searchQuery')

      // 初始化graph和nodeArray
      let graph: IGraphProps[] = []
      let nodeArray: INodeArrayProps[] = []

      debugger
      // 根据isParseLockFile参数判断是否解析锁文件
      if (isParseLockFile) {
        graph = lockData.graph
        nodeArray = lockData.nodeArray

        // 根据搜索关键字过滤图数据
        if (searchQuery) {
          // 筛选包含关键字的节点
          const filteredNodes = nodeArray.filter((node) =>
            node.id.includes(searchQuery)
          )
          // 将筛选出的节点根据id创建Set, 用于后续过滤边
          const filteredNodeIds = new Set(filteredNodes.map((node) => node.id))

          // 筛选包含关键字的边
          const filteredEdges = graph.filter(
            (edge) =>
              filteredNodeIds.has(edge.source) &&
              filteredNodeIds.has(edge.target)
          )
          // 包含相关联的节点的id
          const relatedNodesIds = new Set(
            filteredEdges.flatMap((edge) => [edge.source, edge.target])
          )
          // 筛选包含相关联的节点
          nodeArray = nodeArray.filter((node) => relatedNodesIds.has(node.id))
          graph = filteredEdges
        }
      } else {
        // 读取项目路径和包信息
        const pkgDir = await readPkgPath() // 'package.json' 路径
        const pkg = await getProjectPakcageJson(pkgDir) // 'package.json' 内容
        const graphBuilder = new DependencyGraphBuilder(pkgDir) // 创建实例
        const data = await graphBuilder.getGraphData({
          searchQuery,
          pkg,
          depth: depth || undefined
        })

        if (data) {
          graph = data.graph
          nodeArray = data.nodeArray
        }
      }

      // 返回图数据
      ctx.body = {
        code: 0,
        data: { graph, nodeArray }
      } as GetGraphControllerResponse
    } catch (error) {
      // 处理异常
      ctx.body = {
        code: 1,
        data: { graph: [], nodeArray: [] }
      } as GetGraphControllerResponse
    }
    await next()
  })

  // 应用路由中间件
  app.use(router.routes()).use(router.allowedMethods())

  // 启动服务器
  app.listen(PORT, () => {
    console.log(`app started at port ${PORT}...`)
  })

  // TODO: 打开浏览器(测试关闭)
  await open(`http://localhost:${CLIENT_PORT}/`, {
    app: { name: 'google chrome', arguments: ['--disable-extensions'] }
  })
}

// 生成依赖关系图并保存到文件
const generateAndSaveGraph = async (depth: number, json: string) => {
  // 读取项目路径
  const pkgDir = await readPkgPath()
  // 获取项目package.json信息
  const pkg = await getProjectPakcageJson(pkgDir)

  // 创建实例
  const graphBuilder = new DependencyGraphBuilder(pkgDir)
  // 获取数据
  const data = await graphBuilder.getGraphData({ pkg, depth })

  // 保存数据到文件
  await saveJsonToFile(JSON.stringify(data), json)
}

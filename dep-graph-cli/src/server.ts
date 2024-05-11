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
import { GetGraphControllerResponse } from './type'
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
  console.log('isParseLockFile', isParseLockFile)

  if (isParseLockFile) {
    // 解析 lock file，需要兼容 npm/yarn/pnpm
    const lockFileClasses = {
      'pnpm-lock.yaml': PnpmLockGraph,
      'yarn.lock': YarnLockGraph,
      'package-lock.json': NpmLockGraph
    }
    const { name, content, lockPath } = await getProjectLockFile()
    const LockGraphClass = lockFileClasses[name]
    if (LockGraphClass) {
      await processLockFile(LockGraphClass, { name, content, lockPath }, json)
    } else {
      console.error('不支持的 lock file 类型：', name)
    }
  } else {
    // 读 node_modules 里面的 packages 的目录/文件，找出依赖关系
    if (json) {
      generateAndSaveGraph(depth, json)
    } else {
      startApiServer(depth)
    }
  }
}

// 处理解析LockFile的共通部分
async function processLockFile(lockFileClass, lockFileInfo, json) {
  const lockParser = new lockFileClass(lockFileInfo)
  const lockData = await lockParser.parse()

  if (json) {
    await saveJsonToFile(JSON.stringify(lockData), json)
  } else {
    startLockApiServer(lockData)
  }
}

// 启动解析LockFile服务器并提供API
const startLockApiServer = async (data: any) => {
  const app = new Koa()
  const router = new Router()

  app.use(async (ctx: Context, next: () => Promise<void>) => {
    console.log(`Process ${ctx.request.method} ${ctx.request.url}...`)
    ctx.set(HEADERS)
    ctx.set('Access-Control-Allow-Origin', '*')
    ctx.set('Access-Control-Allow-Headers', '*')
    if (ctx.request.method === 'OPTIONS') {
      ctx.status = 200
      ctx.body = 'success'
      return
    }
    await next()
  })

  app.use(logger())
  app.use(errorCatch())

  router.get('/api/graph', async (ctx: Context, next: () => Promise<void>) => {
    try {
      const searchQuery = getQueryParam(ctx.query, 'searchQuery')

      if (data) {
        let { graph, nodeArray } = data

        if (searchQuery) {
          const filteredNodes = nodeArray.filter((node) =>
            node.id.includes(searchQuery)
          )
          const filteredNodeIds = new Set(filteredNodes.map((node) => node.id))

          const filteredEdges = graph.filter(
            (edge) =>
              filteredNodeIds.has(edge.source) &&
              filteredNodeIds.has(edge.target)
          )
          const relatedNodesIds = new Set(
            filteredEdges.flatMap((edge) => [edge.source, edge.target])
          )
          nodeArray = nodeArray.filter((node) => relatedNodesIds.has(node.id))
          graph = filteredEdges
        }

        ctx.body = {
          code: 0,
          data: { graph, nodeArray }
        } as GetGraphControllerResponse
      }
    } catch (error) {
      ctx.body = {
        code: 1,
        data: { graph: [], nodeArray: [] }
      } as GetGraphControllerResponse
    }
    await next()
  })

  app.use(router.routes()).use(router.allowedMethods())

  app.listen(PORT, () => {
    console.log(`app started at port ${PORT}...`)
  })

  // TODO: 打开浏览器(测试关闭)
  await open(`http://localhost:${CLIENT_PORT}/`, {
    app: { name: 'google chrome', arguments: ['--disable-extensions'] }
  })
}

// 启动服务器并提供API
const startApiServer = async (depth: number) => {
  const app = new Koa()
  const router = new Router()

  app.use(async (ctx: Context, next: () => Promise<void>) => {
    console.log(`Process ${ctx.request.method} ${ctx.request.url}...`)
    ctx.set(HEADERS)
    ctx.set('Access-Control-Allow-Origin', '*')
    ctx.set('Access-Control-Allow-Headers', '*')
    if (ctx.request.method === 'OPTIONS') {
      ctx.status = 200
      ctx.body = 'success'
      return
    }
    await next()
  })

  app.use(logger())
  app.use(errorCatch())

  router.get('/api/graph', async (ctx: Context, next: () => Promise<void>) => {
    try {
      const searchQuery = getQueryParam(ctx.query, 'searchQuery')
      const pkgDir = await readPkgPath()

      const pkg = await getProjectPakcageJson()

      const graphBuilder = new DependencyGraphBuilder(pkgDir)
      const data = await graphBuilder.getGraphData({
        searchQuery,
        pkg,
        depth
      })

      if (data) {
        const { graph, nodeArray } = data
        ctx.body = {
          code: 0,
          data: { graph, nodeArray }
        } as GetGraphControllerResponse
      }
    } catch (error) {
      ctx.body = {
        code: 1,
        data: { graph: [], nodeArray: [] }
      } as GetGraphControllerResponse
    }
    await next()
  })

  app.use(router.routes()).use(router.allowedMethods())

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
  const pkgDir = await readPkgPath()
  const pkg = await getProjectPakcageJson()

  const graphBuilder = new DependencyGraphBuilder(pkgDir)
  const data = await graphBuilder.getGraphData({ pkg, depth })

  await saveJsonToFile(JSON.stringify(data), json)
}

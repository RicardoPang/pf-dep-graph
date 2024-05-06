import Koa from 'koa'
import { Context } from 'koa'
import Router from 'koa-router'
import logger from 'koa-pino-logger'
import {
  CLIENT_PORT,
  HEADERS,
  PORT,
  getProjectPakcageJson,
  getQueryParam,
  readPkgPath,
  saveJsonToFile
} from './utils'
import { errorCatch } from './middlewares/errorCatch'
import { GetGraphControllerResponse } from './type'
import { DependencyGraphBuilder } from './graphBuilder'
import open from 'open'

// 开启服务器
export const startServer = async (depth: number, json: string) => {
  if (json) {
    generateAndSaveGraph(depth, json)
  } else {
    startApiServer(depth)
  }
}

// 启动服务器提供API
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
      const q = getQueryParam(ctx.query, 'q')
      const pkgDir = await readPkgPath()

      const pkg = await getProjectPakcageJson()
      console.log('项目的package.json内容:', pkg)

      const graphBuilder = new DependencyGraphBuilder(pkgDir)
      const data = await graphBuilder.getGraphData({
        q,
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

  await open(`http://localhost:${CLIENT_PORT}/`, {
    app: { name: 'google chrome', arguments: ['--disable-extensions'] }
  })
}

// 生成依赖关系图并保存到文件
const generateAndSaveGraph = async (depth: number, json: string) => {
  const pkgDir = await readPkgPath()
  const pkg = await getProjectPakcageJson()
  console.log('项目的package.json内容:', pkg)

  const graphBuilder = new DependencyGraphBuilder(pkgDir)
  const data = await graphBuilder.getGraphData({ pkg, depth })

  await saveJsonToFile(JSON.stringify(data), json)
}

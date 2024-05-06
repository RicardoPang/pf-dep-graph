import Koa from 'koa'
import { Context } from 'koa'
import Router from 'koa-router'
import logger from 'koa-pino-logger'
import {
  CLIENT_PORT,
  HEADERS,
  PORT,
  isArray,
  readPackageJson,
  readPkgPath
} from './constants'
import { errorCatch } from './middlewares/errorCatch'
import { GetGraphControllerResponse } from './type'
import { DependencyGraphBuilder } from './graphBuilder'
import open from 'open'

const app = new Koa()
const router = new Router()

// 开启服务器
export const startServer = async (depth: number, json: string) => {
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
      const pkg = await readPackageJson()
      const pkgDir = await readPkgPath()

      const graphBuilder = new DependencyGraphBuilder(pkgDir)
      const data = await graphBuilder.getGraphData({
        q,
        pkg,
        depth,
        json
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

function getQueryParam(query: any, key: string): string | undefined {
  const value = query[key]
  if (isArray(value)) {
    return value[0]
  } else if (typeof value === 'string') {
    return value ? value : undefined
  }
  return undefined
}

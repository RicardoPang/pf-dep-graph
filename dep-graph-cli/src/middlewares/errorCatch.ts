import { type Context, type Middleware } from 'koa'

export const errorCatch = (): Middleware => {
  return async (ctx: Context, next: () => Promise<void>) => {
    try {
      await next()
    } catch (err) {
      ctx.status = err.statusCode || err.status || 500
      ctx.body = {
        code: ctx.status,
        message: err.message
      }
    }
  }
}

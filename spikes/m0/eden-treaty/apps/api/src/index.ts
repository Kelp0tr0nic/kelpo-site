import { Elysia } from 'elysia'

const webOrigin = process.env.M0_WEB_ORIGIN ?? 'http://localhost:4312'

export const app = new Elysia().get('/proof', ({ set }) => {
  set.headers['access-control-allow-origin'] = webOrigin

  return {
    message: 'M0_EDEN_TYPED',
    count: 42,
  } as const
})

export type App = typeof app

import path from 'node:path'
import { Elysia } from 'elysia'

import { auth } from './auth'

const distDir = path.resolve(import.meta.dir, '..', 'dist')

export const app = new Elysia()
  .mount(auth.handler)
  .get('/health', () => ({ marker: 'M0_AUTH_READY' }))
  .get('/session', async ({ request, status }) => {
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session) {
      return status(401, { error: 'M0_NO_SESSION' })
    }

    return {
      marker: 'M0_SESSION_OK',
      user: { email: session.user.email },
      session: { id: session.session.id },
    }
  })
  .get('/', () => Bun.file(path.join(distDir, 'index.html')))
  .get('/client.js', () => Bun.file(path.join(distDir, 'client.js')))

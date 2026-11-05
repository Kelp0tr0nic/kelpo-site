import { getMigrations } from 'better-auth/db/migration'

import { app } from './app'
import { auth } from './auth'

const port = Number(process.env.M0_APP_PORT)
if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error('M0_APP_PORT must be a valid port supplied by scripts/verify.ts')
}

const { toBeCreated, toBeAdded, runMigrations } = await getMigrations(auth.options)
console.log(`M0 migrations: ${toBeCreated.length} tables to create, ${toBeAdded.length} tables to update`)
await runMigrations()

app.listen({ hostname: 'localhost', port })
console.log(`M0 Better Auth Elysia app listening on http://localhost:${port}`)

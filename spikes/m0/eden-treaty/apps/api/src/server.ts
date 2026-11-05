import { app } from './index'

const port = Number(process.env.M0_API_PORT)
if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error('M0_API_PORT must be a valid port supplied by scripts/verify.ts')
}

app.listen({ hostname: 'localhost', port })
console.log(`M0 Elysia API listening on http://localhost:${port}`)

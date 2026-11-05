import { Elysia } from 'elysia'
import { resume } from './resume.ts'

const PORT = Number(process.env.PORT ?? 3000)

const app = new Elysia()
  .get('/api/health', () => ({ status: 'ok', at: new Date().toISOString() }))
  // Elysia serialises the returned object to JSON and infers its response type.
  .get('/api/resume', () => resume)
  .listen(PORT)

// Useful later if you adopt Eden for an end-to-end typed client.
export type App = typeof app

console.log(`Backend ready at http://localhost:${PORT}`)
console.log(`  /api/health  -> liveness check`)
console.log(`  /api/resume  -> resume data`)

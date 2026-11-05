import { expect, test } from 'bun:test'

import { NO_SESSION_MARKER, requireEnvironment } from './helpers'

const baseUrl = requireEnvironment('M0_BASE_URL')

test('mounted Better Auth handler returns no session to an anonymous request', async () => {
  const response = await fetch(`${baseUrl}/api/auth/get-session`)

  expect(response.status).toBe(200)
  expect(await response.json()).toBeNull()
})

test('Elysia session lookup rejects a missing session cookie', async () => {
  const response = await fetch(`${baseUrl}/session`)

  expect(response.status).toBe(401)
  expect(await response.json()).toEqual({ error: NO_SESSION_MARKER })
})

test('Elysia session lookup rejects an invalid session cookie', async () => {
  const response = await fetch(`${baseUrl}/session`, {
    headers: { Cookie: 'better-auth.session_token=definitely-invalid' },
  })

  expect(response.status).toBe(401)
  expect(await response.json()).toEqual({ error: NO_SESSION_MARKER })
})

import { expect, test } from 'bun:test'

import { requireEnvironment } from './helpers'

const apiUrl = requireEnvironment('M0_API_URL')

test('Elysia serves the exact typed payload over real HTTP', async () => {
  const response = await fetch(`${apiUrl}/proof`, {
    headers: { Origin: 'http://localhost:4312' },
  })

  expect(response.status).toBe(200)
  expect(response.headers.get('access-control-allow-origin')).toBe('http://localhost:4312')
  expect(await response.json()).toEqual({ message: 'M0_EDEN_TYPED', count: 42 })
})

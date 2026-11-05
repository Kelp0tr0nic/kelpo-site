import { expect, test } from 'bun:test'

import { assertRawExcludes, assertRawIncludes, requireBaseUrl } from './helpers'

const baseUrl = requireBaseUrl()

test('production server route returns complete SSR HTML', async () => {
  const response = await fetch(`${baseUrl}/server`)
  const html = await response.text()

  expect(response.status).toBe(200)
  assertRawIncludes(html, '<h1>M0_SERVER_RENDERED</h1>')
})

test('client-only route omits its component marker from raw HTML', async () => {
  const response = await fetch(`${baseUrl}/client-only`)
  const html = await response.text()

  expect(response.status).toBe(200)
  assertRawExcludes(html, '<h1>M0_CLIENT_ONLY</h1>')
})

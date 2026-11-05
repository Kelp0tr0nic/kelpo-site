import { expect, test } from 'bun:test'

import {
  assertRawExcludes,
  assertRawIncludes,
  BROWSER_MARKER,
  requireEnvironment,
  SSR_MARKER,
} from './helpers'

const baseUrl = requireEnvironment('M0_BASE_URL')

test('production SSR HTML contains the value loaded through Eden Treaty', async () => {
  const response = await fetch(`${baseUrl}/server`)
  const html = await response.text()

  expect(response.status).toBe(200)
  assertRawIncludes(html, SSR_MARKER)
})

test('client-only raw HTML does not contain the browser result', async () => {
  const response = await fetch(`${baseUrl}/client-only`)
  const html = await response.text()

  expect(response.status).toBe(200)
  assertRawExcludes(html, BROWSER_MARKER)
})

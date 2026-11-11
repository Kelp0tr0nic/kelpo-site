import { expect, test } from 'bun:test'

import {
  assertRawIncludes,
  isReadyPostHtml,
  RENDERED_PARAGRAPH,
  requireBaseUrl,
  SERVER_HEADING,
} from './helpers'

const baseUrl = requireBaseUrl()

test('production post route renders Tiptap JSON as real server HTML', async () => {
  const response = await fetch(`${baseUrl}/post`)
  const html = await response.text()

  expect(response.status).toBe(200)
  assertRawIncludes(html, SERVER_HEADING)
  assertRawIncludes(html, RENDERED_PARAGRAPH)
  expect(isReadyPostHtml(html)).toBe(true)
  console.log(html.slice(html.indexOf('<article'), html.indexOf('</article>') + 10))
})

test('readiness and SSR detector reject missing rendered content', () => {
  expect(isReadyPostHtml('<article><h2>DIFFERENT</h2></article>')).toBe(false)
  expect(() => assertRawIncludes('<article></article>', SERVER_HEADING)).toThrow(
    'Expected raw HTML to include',
  )
})

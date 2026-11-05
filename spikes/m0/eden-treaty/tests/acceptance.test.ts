import { expect, test } from 'bun:test'

import { assertRawExcludes, assertRawIncludes, BROWSER_MARKER, SSR_MARKER } from './helpers'

test('SSR inclusion detector rejects HTML missing the typed API marker', () => {
  expect(() => assertRawIncludes('<html><h1>DIFFERENT_CONTENT</h1></html>', SSR_MARKER)).toThrow(
    'Expected raw HTML to include',
  )
})

test('browser exclusion detector rejects a marker leaked into raw HTML', () => {
  expect(() => assertRawExcludes(`<html><h1>${BROWSER_MARKER}</h1></html>`, BROWSER_MARKER)).toThrow(
    'Expected raw HTML to exclude',
  )
})

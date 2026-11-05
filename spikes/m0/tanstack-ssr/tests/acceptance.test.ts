import { expect, test } from 'bun:test'

import { assertRawExcludes, assertRawIncludes } from './helpers'

test('SSR inclusion detector rejects HTML missing the marker', () => {
  expect(() =>
    assertRawIncludes('<html><h1>DIFFERENT_CONTENT</h1></html>', '<h1>M0_SERVER_RENDERED</h1>'),
  ).toThrow('Expected raw HTML to include')
})

test('SSR exclusion detector rejects HTML containing the client marker', () => {
  expect(() =>
    assertRawExcludes('<html><h1>M0_CLIENT_ONLY</h1></html>', '<h1>M0_CLIENT_ONLY</h1>'),
  ).toThrow('Expected raw HTML to exclude')
})

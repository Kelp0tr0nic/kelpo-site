import { expect, test } from 'bun:test'

import { assertMarker } from './helpers'

test('response marker detector rejects a missing marker', () => {
  expect(() => assertMarker('{"marker":"DIFFERENT_CONTENT"}', 'M0_AUTH_READY')).toThrow(
    'Expected response to include',
  )
})

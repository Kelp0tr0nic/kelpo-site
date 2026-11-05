import { afterAll, beforeAll, expect, test } from 'bun:test'
import { chromium, type Browser } from '@playwright/test'

import { BROWSER_MARKER, requireEnvironment } from './helpers'

const baseUrl = requireEnvironment('M0_BASE_URL')
let browser: Browser

beforeAll(async () => {
  browser = await chromium.launch({ headless: true })
})

afterAll(async () => {
  await browser?.close()
})

test('Chromium renders the API value returned to browser Eden Treaty code', async () => {
  const page = await browser.newPage()
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  try {
    const response = await page.goto(`${baseUrl}/client-only`, { waitUntil: 'networkidle' })
    expect(response?.status()).toBe(200)

    const heading = page.getByRole('heading', { name: BROWSER_MARKER })
    await heading.waitFor({ state: 'visible' })
    expect(await heading.textContent()).toBe(BROWSER_MARKER)
    expect(pageErrors).toEqual([])
  } finally {
    await page.close()
  }
})

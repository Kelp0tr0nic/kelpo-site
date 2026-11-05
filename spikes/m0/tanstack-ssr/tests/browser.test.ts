import { afterAll, beforeAll, expect, test } from 'bun:test'
import { chromium, type Browser } from '@playwright/test'

import { requireBaseUrl } from './helpers'

const baseUrl = requireBaseUrl()
let browser: Browser

beforeAll(async () => {
  browser = await chromium.launch({ headless: true })
})

afterAll(async () => {
  await browser?.close()
})

test('client-only route renders its component in Chromium', async () => {
  const page = await browser.newPage()

  try {
    const response = await page.goto(`${baseUrl}/client-only`, { waitUntil: 'networkidle' })
    expect(response?.status()).toBe(200)

    const heading = page.getByRole('heading', { name: 'M0_CLIENT_ONLY' })
    await heading.waitFor({ state: 'visible' })
    expect(await heading.textContent()).toBe('M0_CLIENT_ONLY')
  } finally {
    await page.close()
  }
})

import { afterAll, beforeAll, expect, test } from 'bun:test'
import { chromium, type Browser } from '@playwright/test'

import { scanPublicChunks } from '../scripts/scan-public-chunks'
import { requireBaseUrl, requirePublicDir } from './helpers'

const baseUrl = requireBaseUrl()
const publicDir = requirePublicDir()
let browser: Browser

beforeAll(async () => {
  browser = await chromium.launch({ headless: true })
})

afterAll(async () => {
  await browser?.close()
})

test('browser-loaded public chunks contain no Tiptap or ProseMirror code', async () => {
  const page = await browser.newPage()
  const javascriptUrls = new Set<string>()
  const pageErrors: string[] = []

  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('response', (response) => {
    const contentType = response.headers()['content-type'] ?? ''
    if (response.request().resourceType() === 'script' || contentType.includes('javascript')) {
      javascriptUrls.add(response.url())
    }
  })

  try {
    const response = await page.goto(`${baseUrl}/post`, { waitUntil: 'networkidle' })
    expect(response?.status()).toBe(200)
    await page.getByRole('heading', { name: 'M0_TIPTAP_SERVER_HTML' }).waitFor({ state: 'visible' })
    await page.locator('strong', { hasText: 'M0_TIPTAP_BOLD' }).waitFor({ state: 'visible' })
    expect(pageErrors).toEqual([])

    const scanned = await scanPublicChunks([...javascriptUrls], publicDir)
    expect(scanned.length).toBeGreaterThan(0)
    console.log(JSON.stringify(scanned.map((chunk) => ({
      url: chunk.url,
      filePath: chunk.filePath,
      mapPath: chunk.mapPath,
      sources: chunk.sources,
    })), null, 2))
  } finally {
    await page.close()
  }
})

import { afterAll, beforeAll, expect, test } from 'bun:test'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium, type Browser } from '@playwright/test'

import {
  collectBrowserErrors,
  findLazyOrbitChunk,
  isHydrationError,
  isReadyPostHtml,
  ORBIT_SHELL,
  requireBaseUrl,
  requirePublicDir,
  withoutScripts,
} from './helpers'

const baseUrl = requireBaseUrl()
const publicDir = requirePublicDir()
const spikeDir = path.resolve(import.meta.dir, '..')
let browser: Browser

beforeAll(async () => {
  browser = await chromium.launch({ headless: true })
})

afterAll(async () => {
  await browser?.close()
})

test('SSR detector accepts the semantic shell but rejects a script-only marker', () => {
  expect(isReadyPostHtml(`<html><body>${ORBIT_SHELL}</body></html>`)).toBe(true)
  expect(isReadyPostHtml('<script>{"marker":"M0_ORBIT_NODE_SSR"}</script>')).toBe(false)
})

test('production SSR renders the custom node without preloading its lazy chunk', async () => {
  const response = await fetch(`${baseUrl}/post`)
  const html = await response.text()
  expect(response.status).toBe(200)
  expect(isReadyPostHtml(html)).toBe(true)

  const lazyChunk = await findLazyOrbitChunk(publicDir)
  expect(lazyChunk.isDynamicEntry).toBe(true)
  expect(lazyChunk.file).toMatch(/orbit-card.*\.js$/)
  const resourceTags = html.match(/<(?:script|link)\b[^>]*>/gi) ?? []
  expect(resourceTags.filter((tag) => tag.includes(lazyChunk.urlPath))).toEqual([])

  const fixture = await readFile(path.join(spikeDir, 'src/post/fixture.ts'), 'utf8')
  const orbitNode = await readFile(path.join(spikeDir, 'src/post/orbit-node.ts'), 'utf8')
  const nodeView = await readFile(path.join(spikeDir, 'src/post/orbit-node-view.tsx'), 'utf8')
  const postRoute = await readFile(path.join(spikeDir, 'src/routes/post.tsx'), 'utf8')
  expect(fixture).toContain("type: 'orbitCard'")
  expect(orbitNode).toContain("name: 'orbitCard'")
  expect(orbitNode).toContain('atom: true')
  expect(nodeView).toContain("lazy(() => import('../components/orbit-card'))")
  expect(nodeView).toContain('fallback={<OrbitCardShell {...props} />}')
  expect(postRoute).toContain('renderToReactElement')
  expect(postRoute).toContain('nodeMapping: { orbitCard: OrbitNodeView }')

  console.log(JSON.stringify({
    articleHtml: withoutScripts(html).match(/<article>[\s\S]*?<\/article>/)?.[0],
    lazyChunk,
    initialResourceTags: resourceTags,
  }, null, 2))
})

test('Chromium requests the separate chunk after hydration and mounts without errors', async () => {
  const page = await browser.newPage()
  const errors = collectBrowserErrors(page)
  const scriptRequests: string[] = []
  const lazyChunk = await findLazyOrbitChunk(publicDir)

  page.on('request', (request) => {
    if (request.resourceType() === 'script') scriptRequests.push(request.url())
  })
  const lazyResponsePromise = page.waitForResponse((response) =>
    response.url().endsWith(lazyChunk.urlPath),
  )
  let notifyLazyRequested = () => {}
  const lazyRequested = new Promise<void>((resolve) => {
    notifyLazyRequested = resolve
  })
  let releaseLazyResponse = () => {}
  const lazyResponseGate = new Promise<void>((resolve) => {
    releaseLazyResponse = resolve
  })
  await page.route(`**${lazyChunk.urlPath}`, async (route) => {
    notifyLazyRequested()
    await lazyResponseGate
    await route.continue()
  })

  try {
    const response = await page.goto(`${baseUrl}/post`, { waitUntil: 'domcontentloaded' })
    expect(response?.status()).toBe(200)
    await lazyRequested

    const orbit = page.locator('[data-orbit-card="orbitCard"]')
    await orbit.waitFor({ state: 'visible' })
    expect(await orbit.evaluate((element) => element.outerHTML)).toBe(ORBIT_SHELL)

    releaseLazyResponse()
    await page.waitForLoadState('networkidle')
    const lazyResponse = await lazyResponsePromise
    expect(lazyResponse.status()).toBe(200)

    await page.waitForFunction(() =>
      document.querySelector('[data-orbit-card="orbitCard"]')?.getAttribute('data-client-mounted') === 'true',
    )
    expect(await orbit.getAttribute('data-client-mounted')).toBe('true')
    await orbit.getByRole('heading', { name: 'M0_ORBIT_NODE_SSR' }).waitFor({ state: 'visible' })
    await orbit.getByText('M0_ORBIT_LABEL').waitFor({ state: 'visible' })
    expect(scriptRequests.filter((url) => url.endsWith(lazyChunk.urlPath))).toHaveLength(1)
    expect(errors).toEqual([])

    console.log(JSON.stringify({ scriptRequests, lazyChunk: lazyChunk.urlPath, errors }, null, 2))
  } finally {
    releaseLazyResponse()
    await page.close()
  }
})

test('the same collector detects a deliberate hydration mismatch', async () => {
  const page = await browser.newPage()
  const errors = collectBrowserErrors(page)

  try {
    const response = await page.goto(`${baseUrl}/negative-hydration`, { waitUntil: 'networkidle' })
    expect(response?.status()).toBe(200)
    await page.getByText('M0_HYDRATION_CLIENT').waitFor({ state: 'visible' })
    expect(errors.some(isHydrationError)).toBe(true)
    console.log(JSON.stringify({ negativeHydrationErrors: errors }, null, 2))
  } finally {
    await page.close()
  }
})

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { Page } from '@playwright/test'

export const ORBIT_SHELL =
  '<section data-orbit-card="orbitCard" data-client-mounted="false"><h2>M0_ORBIT_NODE_SSR</h2><p>M0_ORBIT_LABEL</p></section>'

export function withoutScripts(html: string): string {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
}

export function isReadyPostHtml(html: string): boolean {
  return withoutScripts(html).includes(ORBIT_SHELL)
}

export function requireBaseUrl(): string {
  const baseUrl = process.env.M0_BASE_URL
  if (!baseUrl) throw new Error('M0_BASE_URL must be set by scripts/verify.ts')
  return baseUrl
}

export function requirePublicDir(): string {
  const publicDir = process.env.M0_PUBLIC_DIR
  if (!publicDir) throw new Error('M0_PUBLIC_DIR must be set by scripts/verify.ts')
  return publicDir
}

export function collectBrowserErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console.error: ${message.text()}`)
  })
  return errors
}

export function isHydrationError(message: string): boolean {
  return /hydration|text content|did not match|server rendered|#418|#423|#425/i.test(message)
}

export interface LazyChunk {
  key: string
  file: string
  urlPath: string
  isDynamicEntry: boolean
}

export async function findLazyOrbitChunk(publicDir: string): Promise<LazyChunk> {
  const manifestPath = path.join(publicDir, '.vite', 'manifest.json')
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Record<string, {
    file?: string
    src?: string
    isDynamicEntry?: boolean
  }>
  const match = Object.entries(manifest).find(([key, entry]) =>
    [key, entry.src].some((value) => value?.replaceAll('\\', '/').endsWith('src/components/orbit-card.tsx')),
  )

  if (!match || !match[1].file) {
    throw new Error(`No dynamic Orbit component entry found in ${manifestPath}`)
  }

  return {
    key: match[0],
    file: match[1].file,
    urlPath: `/${match[1].file}`,
    isDynamicEntry: match[1].isDynamicEntry === true,
  }
}

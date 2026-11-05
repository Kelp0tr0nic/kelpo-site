export const SSR_MARKER = '<h1>M0_EDEN_TYPED_SSR</h1>'
export const BROWSER_MARKER = 'M0_EDEN_TYPED_BROWSER'

export function assertRawIncludes(html: string, marker: string): void {
  if (!html.includes(marker)) {
    throw new Error(`Expected raw HTML to include ${JSON.stringify(marker)}`)
  }
}

export function assertRawExcludes(html: string, marker: string): void {
  if (html.includes(marker)) {
    throw new Error(`Expected raw HTML to exclude ${JSON.stringify(marker)}`)
  }
}

export function requireEnvironment(name: 'M0_BASE_URL' | 'M0_API_URL'): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} must be set by scripts/verify.ts`)
  }
  return value
}

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

export function requireBaseUrl(): string {
  const baseUrl = process.env.M0_BASE_URL
  if (!baseUrl) {
    throw new Error('M0_BASE_URL must be set by scripts/verify.ts')
  }
  return baseUrl
}

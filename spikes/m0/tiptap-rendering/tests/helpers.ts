export const SERVER_HEADING = '<h2>M0_TIPTAP_SERVER_HTML</h2>'
export const RENDERED_PARAGRAPH =
  '<p>M0_TIPTAP_PARAGRAPH <strong>M0_TIPTAP_BOLD</strong></p>'

export function assertRawIncludes(html: string, marker: string): void {
  if (!html.includes(marker)) {
    throw new Error(`Expected raw HTML to include ${JSON.stringify(marker)}`)
  }
}

export function isReadyPostHtml(html: string): boolean {
  return html.includes(SERVER_HEADING) && html.includes(RENDERED_PARAGRAPH)
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

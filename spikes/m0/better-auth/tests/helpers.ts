export const AUTH_READY_MARKER = 'M0_AUTH_READY'
export const NO_SESSION_MARKER = 'M0_NO_SESSION'
export const SESSION_OK_MARKER = 'M0_SESSION_OK'
export const TEST_EMAIL = 'm0-passkey@example.test'

export function requireEnvironment(name: 'M0_BASE_URL'): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} must be set by scripts/verify.ts`)
  }
  return value
}

export function assertMarker(body: string, marker: string): void {
  if (!body.includes(marker)) {
    throw new Error(`Expected response to include ${JSON.stringify(marker)}`)
  }
}

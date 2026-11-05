import { afterAll, beforeAll, expect, test } from 'bun:test'
import { chromium, type Browser, type BrowserContext, type Page } from '@playwright/test'

import { SESSION_OK_MARKER, TEST_EMAIL, requireEnvironment } from './helpers'

const baseUrl = requireEnvironment('M0_BASE_URL')
let browser: Browser

beforeAll(async () => {
  browser = await chromium.launch({ headless: true })
})

afterAll(async () => {
  await browser?.close()
})

async function openHarness(context: BrowserContext, pageErrors: string[]): Promise<Page> {
  const page = await context.newPage()
  page.on('pageerror', (error) => pageErrors.push(error.message))
  const response = await page.goto(baseUrl, { waitUntil: 'networkidle' })
  expect(response?.status()).toBe(200)
  await page.getByRole('heading', { name: 'M0 Better Auth' }).waitFor()
  return page
}

async function sessionStatus(page: Page): Promise<number> {
  return page.evaluate(async () => (await fetch('/session')).status)
}

test('virtual passkey registers and logs in from a fresh browser context', async () => {
  const registrationContext = await browser.newContext()
  const registrationErrors: string[] = []
  let credential: Awaited<ReturnType<BrowserContext['credentials']['get']>>[number] | undefined

  try {
    await registrationContext.credentials.install()
    const page = await openHarness(registrationContext, registrationErrors)
    expect(await registrationContext.credentials.get({ rpId: 'localhost' })).toHaveLength(0)

    await page.getByRole('button', { name: 'Register passkey' }).click()
    await page.getByText('M0_PASSKEY_REGISTERED', { exact: true }).waitFor()

    const credentials = await registrationContext.credentials.get({ rpId: 'localhost' })
    expect(credentials).toHaveLength(1)
    credential = credentials[0]
    expect(credential.rpId).toBe('localhost')

    await page.getByRole('button', { name: 'Sign out' }).click()
    await page.getByText('M0_SIGNED_OUT', { exact: true }).waitFor()
    expect(await sessionStatus(page)).toBe(401)
    expect(registrationErrors).toEqual([])
  } finally {
    await registrationContext.close()
  }

  if (!credential) throw new Error('Passkey registration produced no virtual credential')
  const loginContext = await browser.newContext()
  const loginErrors: string[] = []

  try {
    expect(await loginContext.cookies()).toEqual([])
    await loginContext.credentials.create(credential.rpId, credential)
    await loginContext.credentials.install()
    const page = await openHarness(loginContext, loginErrors)
    expect(await sessionStatus(page)).toBe(401)

    await page.getByRole('button', { name: 'Sign in with passkey' }).click()
    await page.getByText('M0_PASSKEY_LOGIN_OK', { exact: true }).waitFor()

    const response = await loginContext.request.get(`${baseUrl}/session`)
    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body.marker).toBe(SESSION_OK_MARKER)
    expect(body.user.email).toBe(TEST_EMAIL)

    const cookies = await loginContext.cookies()
    expect(cookies.some((cookie) => cookie.name.includes('session_token') && cookie.httpOnly)).toBe(true)
    expect(loginErrors).toEqual([])
  } finally {
    await loginContext.close()
  }
})

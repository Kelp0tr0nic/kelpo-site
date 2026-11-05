import { createAuthClient } from 'better-auth/client'
import { passkeyClient } from '@better-auth/passkey/client'

const authClient = createAuthClient({ plugins: [passkeyClient()] })

function requireElement<ElementType extends Element>(selector: string): ElementType {
  const element = document.querySelector<ElementType>(selector)
  if (!element) throw new Error(`Missing ${selector} element`)
  return element
}

const status = requireElement<HTMLElement>('#status')

const bootstrapUser = {
  name: 'M0 Passkey User',
  email: 'm0-passkey@example.test',
  password: 'm0-bootstrap-credential',
}

function showError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error)
  status.textContent = `M0_CLIENT_ERROR: ${message}`
}

async function registerPasskey(): Promise<void> {
  try {
    const signUp = await authClient.signUp.email(bootstrapUser)
    if (signUp.error) {
      throw new Error(signUp.error.message ?? 'Bootstrap sign-up failed')
    }

    const registration = await authClient.passkey.addPasskey({
      name: 'M0 virtual passkey',
      authenticatorAttachment: 'platform',
    })
    if (registration.error) {
      throw new Error(registration.error.message ?? 'Passkey registration failed')
    }

    status.textContent = 'M0_PASSKEY_REGISTERED'
  } catch (error) {
    showError(error)
  }
}

async function signOut(): Promise<void> {
  try {
    const result = await authClient.signOut()
    if (result.error) {
      throw new Error(result.error.message ?? 'Sign-out failed')
    }
    status.textContent = 'M0_SIGNED_OUT'
  } catch (error) {
    showError(error)
  }
}

async function signInWithPasskey(): Promise<void> {
  try {
    const result = await authClient.signIn.passkey({ autoFill: false })
    if (result.error) {
      throw new Error(result.error.message ?? 'Passkey sign-in failed')
    }
    status.textContent = 'M0_PASSKEY_LOGIN_OK'
  } catch (error) {
    showError(error)
  }
}

document.querySelector('#register')?.addEventListener('click', () => void registerPasskey())
document.querySelector('#sign-out')?.addEventListener('click', () => void signOut())
document.querySelector('#passkey-login')?.addEventListener('click', () => void signInWithPasskey())

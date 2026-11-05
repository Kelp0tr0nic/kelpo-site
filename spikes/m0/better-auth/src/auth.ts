import { betterAuth } from 'better-auth'
import { passkey } from '@better-auth/passkey'
import { Pool } from 'pg'

function requireEnvironment(name: 'M0_BASE_URL' | 'M0_DATABASE_URL' | 'M0_AUTH_SECRET'): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} must be set by scripts/verify.ts`)
  }
  return value
}

const baseURL = requireEnvironment('M0_BASE_URL')
const databaseURL = requireEnvironment('M0_DATABASE_URL')
const secret = requireEnvironment('M0_AUTH_SECRET')

if (secret.length < 32) {
  throw new Error('M0_AUTH_SECRET must contain at least 32 characters')
}

export const pool = new Pool({ connectionString: databaseURL, max: 4 })

export const auth = betterAuth({
  baseURL,
  secret,
  database: pool,
  trustedOrigins: [baseURL],
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    passkey({
      rpID: 'localhost',
      rpName: 'M0 Better Auth',
      origin: baseURL,
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        residentKey: 'required',
        userVerification: 'required',
      },
    }),
  ],
})

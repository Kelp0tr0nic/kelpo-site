import { getProof, type Proof } from './api'

export function getServerProof(): Promise<Proof> {
  const baseUrl = import.meta.env.VITE_M0_API_URL
  if (!baseUrl) {
    throw new Error('VITE_M0_API_URL is required for the SSR Eden Treaty client')
  }

  return getProof(baseUrl)
}

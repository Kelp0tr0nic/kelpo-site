import { treaty } from '@elysiajs/eden'
import type { App } from '@m0-eden/api'

export type Proof = {
  readonly message: 'M0_EDEN_TYPED'
  readonly count: 42
}

export function createApi(baseUrl: string) {
  return treaty<App>(baseUrl)
}

export async function getProof(baseUrl: string): Promise<Proof> {
  const { data, error } = await createApi(baseUrl).proof.get()

  if (error) {
    throw new Error(`Eden Treaty request failed with status ${error.status}`)
  }
  if (!data) {
    throw new Error('Eden Treaty returned no proof payload')
  }

  return data
}

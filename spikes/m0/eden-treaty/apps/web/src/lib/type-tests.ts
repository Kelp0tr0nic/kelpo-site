import { getBrowserProof } from './browser-proof'
import { getServerProof } from './server-proof'
import { createApi } from './api'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends
  (<Value>() => Value extends Right ? 1 : 2) ? true : false

type Expect<Value extends true> = Value

type ExpectedProof = {
  readonly message: 'M0_EDEN_TYPED'
  readonly count: 42
}

type ServerTypesCrossWorkspace = Expect<
  Equal<Awaited<ReturnType<typeof getServerProof>>, ExpectedProof>
>
type BrowserTypesCrossWorkspace = Expect<
  Equal<Awaited<ReturnType<typeof getBrowserProof>>, ExpectedProof>
>

export type TypeFlowProof = [ServerTypesCrossWorkspace, BrowserTypesCrossWorkspace]

declare const client: ReturnType<typeof createApi>

async function compileTimeNegativeControls() {
  // @ts-expect-error An unknown API route must be rejected.
  await client.missing.get()

  const result = await client.proof.get()
  if (result.data) {
    // @ts-expect-error The literal message must not accept a different value.
    const wrongMessage: 'WRONG_MESSAGE' = result.data.message
    // @ts-expect-error The numeric count must not be assignable to string.
    const wrongCount: string = result.data.count
    void wrongMessage
    void wrongCount
  }
}

void compileTimeNegativeControls

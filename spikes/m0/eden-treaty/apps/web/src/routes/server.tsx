import { createFileRoute } from '@tanstack/react-router'

import { getServerProof } from '../lib/server-proof'

export const Route = createFileRoute('/server')({
  ssr: true,
  loader: () => getServerProof(),
  component: ServerRoute,
})

function ServerRoute() {
  const proof = Route.useLoaderData()
  return <h1>{`${proof.message}_SSR`}</h1>
}

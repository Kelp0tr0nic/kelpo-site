import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/client-only')({
  ssr: false,
  component: ClientOnlyRoute,
})

function ClientOnlyRoute() {
  return <h1>M0_CLIENT_ONLY</h1>
}

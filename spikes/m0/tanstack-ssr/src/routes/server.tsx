import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/server')({
  ssr: true,
  component: ServerRoute,
})

function ServerRoute() {
  return <h1>M0_SERVER_RENDERED</h1>
}

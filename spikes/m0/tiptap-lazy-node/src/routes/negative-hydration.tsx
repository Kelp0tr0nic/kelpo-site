import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/negative-hydration')({
  component: NegativeHydrationRoute,
})

function NegativeHydrationRoute() {
  return <p>{typeof window === 'undefined' ? 'M0_HYDRATION_SERVER' : 'M0_HYDRATION_CLIENT'}</p>
}

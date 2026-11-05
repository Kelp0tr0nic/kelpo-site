import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { getBrowserProof } from '../lib/browser-proof'

export const Route = createFileRoute('/client-only')({
  ssr: false,
  component: ClientOnlyRoute,
})

function ClientOnlyRoute() {
  const [marker, setMarker] = useState('M0_EDEN_LOADING')

  useEffect(() => {
    let active = true

    getBrowserProof()
      .then((proof) => {
        if (active) setMarker(`${proof.message}_BROWSER`)
      })
      .catch((error: unknown) => {
        console.error(error)
        if (active) setMarker('M0_EDEN_BROWSER_FAILED')
      })

    return () => {
      active = false
    }
  }, [])

  return <h1>{marker}</h1>
}

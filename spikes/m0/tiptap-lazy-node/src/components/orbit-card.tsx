import { useEffect, useState } from 'react'

import { OrbitCardShell } from '../post/orbit-card-shell'

export default function OrbitCard({ label }: { label: string }) {
  const [clientMounted, setClientMounted] = useState(false)

  useEffect(() => {
    setClientMounted(true)
  }, [])

  return <OrbitCardShell label={label} clientMounted={clientMounted} />
}

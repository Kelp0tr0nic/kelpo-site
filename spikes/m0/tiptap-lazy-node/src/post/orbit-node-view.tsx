import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import type { Node as PMNode } from '@tiptap/pm/model'
import type { NodeProps } from '@tiptap/static-renderer/json/react'

import { OrbitCardShell, type OrbitCardProps } from './orbit-card-shell'

const LazyOrbitCard = lazy(() => import('../components/orbit-card'))

type OrbitStaticNodeProps = NodeProps<PMNode, ReactNode | ReactNode[]>

export function OrbitNodeView({ node }: OrbitStaticNodeProps) {
  const props: OrbitCardProps = { label: String(node.attrs.label) }
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  if (!hydrated) return <OrbitCardShell {...props} />
  return (
    <Suspense fallback={<OrbitCardShell {...props} />}>
      <LazyOrbitCard {...props} />
    </Suspense>
  )
}

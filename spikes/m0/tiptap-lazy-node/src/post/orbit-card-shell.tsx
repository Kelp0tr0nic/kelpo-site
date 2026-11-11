export interface OrbitCardProps {
  label: string
  clientMounted?: boolean
}

export function OrbitCardShell({ label, clientMounted = false }: OrbitCardProps) {
  return (
    <section data-orbit-card="orbitCard" data-client-mounted={clientMounted ? 'true' : 'false'}>
      <h2>M0_ORBIT_NODE_SSR</h2>
      <p>{label}</p>
    </section>
  )
}

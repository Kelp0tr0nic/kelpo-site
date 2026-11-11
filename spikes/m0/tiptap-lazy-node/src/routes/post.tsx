import { createFileRoute } from '@tanstack/react-router'
import StarterKit from '@tiptap/starter-kit'
import { renderToReactElement } from '@tiptap/static-renderer/pm/react'

import { postContent } from '../post/fixture'
import { OrbitNode } from '../post/orbit-node'
import { OrbitNodeView } from '../post/orbit-node-view'

export const Route = createFileRoute('/post')({
  component: PostRoute,
})

function PostRoute() {
  return (
    <article>
      {renderToReactElement({
        extensions: [StarterKit, OrbitNode],
        content: postContent,
        options: { nodeMapping: { orbitCard: OrbitNodeView } },
      })}
    </article>
  )
}

import { createFileRoute } from '@tanstack/react-router'

import { getPostHtml } from '../post/get-post-html'

export const Route = createFileRoute('/post')({
  loader: () => getPostHtml(),
  component: PostRoute,
})

function PostRoute() {
  const html = Route.useLoaderData()

  // This spike renders only its fixed, trusted fixture. Untrusted stored HTML is M4 work.
  return <article dangerouslySetInnerHTML={{ __html: html }} />
}

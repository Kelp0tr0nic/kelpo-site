import StarterKit from '@tiptap/starter-kit'
import { renderToHTMLString } from '@tiptap/static-renderer/pm/html-string'

import { postContent } from './fixture'

export function renderPostHtml(): string {
  return renderToHTMLString({
    extensions: [StarterKit],
    content: postContent,
  })
}

import { mergeAttributes, Node } from '@tiptap/core'

export const OrbitNode = Node.create({
  name: 'orbitCard',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      label: { default: 'M0_ORBIT_LABEL' },
    }
  },

  parseHTML() {
    return [{ tag: 'section[data-orbit-card="orbitCard"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['section', mergeAttributes(HTMLAttributes, { 'data-orbit-card': 'orbitCard' })]
  },
})

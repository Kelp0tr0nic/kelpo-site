import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'
import viteReact from '@vitejs/plugin-react'

export default defineConfig({
  build: {
    manifest: true,
    sourcemap: true,
  },
  plugins: [tanstackStart(), nitro({ preset: 'bun' }), viteReact()],
})

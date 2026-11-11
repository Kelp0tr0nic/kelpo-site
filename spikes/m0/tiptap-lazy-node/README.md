# M0 Tiptap lazy node spike

Throwaway validation that a custom Tiptap node can server-render a stable shell, then lazily mount an interactive React component without hydration errors.

## Tested pins

- Bun 1.4.4
- Tiptap core, React, StarterKit, Static Renderer, and PM 3.30.3
- TanStack Start 1.169.4 and Router 1.170.46
- Nitro 3.0.261103-rc
- React and React DOM 19.3.1
- Vite 8.3.5
- TypeScript 7.0.2
- Playwright 1.64.1

From the repository root, after `bun install` and with Playwright Chromium installed:

```bash
bun run verify
```

The verifier checks that port 4351 is free, type-checks, builds the production Bun output with a client manifest and source maps, starts that output itself, runs raw-HTTP and Chromium checks, and stops the server process tree.

The tests prove semantic custom-node SSR, a separate dynamic-import chunk, no initial preload of that chunk, a byte-identical SSR/Suspense shell while the lazy response is held, client mounting after the response, and a clean browser error collector. A separate route deliberately causes a hydration mismatch to prove the same collector detects it.

Approach 1 branched on `typeof window` during render and failed with React hydration error 418. Approach 2 uses React's two-pass hydration pattern: SSR and the hydration render return the plain shell, then an effect enables the lazy Suspense island.

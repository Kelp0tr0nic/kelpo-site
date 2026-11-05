# M0 TanStack SSR spike

Throwaway validation of TanStack Start production SSR on Bun with per-route client-only rendering.

## Tested pins

- Bun 1.4.4
- TanStack Start 1.169.4
- TanStack Router 1.170.46
- Nitro 3.0.261103-rc
- React and React DOM 19.3.1
- Vite 8.3.5
- TypeScript 7.0.2
- Playwright 1.64.1

From the repository root, after `bun install` and with Playwright Chromium installed:

```bash
bun run verify
```

The verifier checks that port 4311 is free, type-checks, builds the production Bun output, starts that output itself, runs unit/raw-HTTP/browser checks, and stops the server process tree.

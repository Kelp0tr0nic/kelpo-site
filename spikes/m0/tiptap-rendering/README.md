# M0 Tiptap rendering spike

Throwaway validation that Tiptap JSON can become production server HTML while browser-loaded public chunks exclude Tiptap and ProseMirror.

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

The verifier checks that port 4341 is free, type-checks, builds the production Bun output with client manifests and source maps, starts that output itself, runs raw-HTTP/browser/scanner checks, and stops the server process tree. The browser test maps every loaded script to its emitted file and source map. Negative controls prove that the scanner rejects Tiptap, ProseMirror, explicit package markers, and empty evidence.

The post fixture is fixed and trusted. This spike does not provide schema validation, allow-listed rendering, sanitization, or a production-safe boundary for untrusted stored HTML.

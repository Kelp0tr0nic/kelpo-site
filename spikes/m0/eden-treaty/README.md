# M0 Eden Treaty spike

## Question

Can an Elysia `App` type cross Bun workspace boundaries into Eden Treaty clients used by both server-rendered and browser code?

## Research brief

- [Eden Treaty overview](https://elysiajs.com/eden/treaty/overview) documents exporting `type App = typeof app`, passing it to `treaty<App>()`, and calling routes through typed properties.
- [Eden Treaty configuration](https://elysiajs.com/eden/treaty/config) distinguishes real URL-backed HTTP clients from direct Elysia instances.
- [Elysia handlers](https://elysiajs.com/essential/handler) documents setting response headers through `set.headers`.
- [TanStack Start selective SSR](https://tanstack.com/start/latest/docs/framework/react/guide/selective-ssr) documents server execution for `ssr: true` routes and client-only execution for `ssr: false` routes.

Chosen approach: use a real URL-backed Eden Treaty client in both environments. A direct Elysia instance would avoid HTTP but would not prove the browser boundary. Eden Fetch is not used because D-16 and M0 specifically name Eden Treaty.

The TanStack Start, React, Bun, Nitro, and Vite pins match the passing SSR spike to isolate Eden as the new variable. Elysia `1.4.31` and Eden `1.4.9` are exact current versions observed through npm metadata. All direct dependencies are pinned.

## Acceptance checks

1. Strict TypeScript resolves `@m0-eden/api` from the separate web workspace and infers the exact response type in both server and browser wrappers.
2. Compile-time negative controls reject an unknown route and incorrect response assignments. If the API type degrades to `any`, these checks fail.
3. A real Elysia server returns the typed payload over HTTP.
4. A Bun-targeted production TanStack Start server renders the payload into raw SSR HTML.
5. A client-only route omits the payload marker from raw HTML, then Chromium retrieves and renders it through Eden Treaty.
6. Runtime detector negative controls prove the HTML checks reject missing or misplaced markers.

Run all checks with `bun run verify` from this directory or the repository root. The verifier owns unique web port `4312` and API port `4313`, starts its own processes, and cleans up both process trees.

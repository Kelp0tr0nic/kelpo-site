# M0: Eden Treaty types across workspaces, SSR, and browser code

## 1. Result

**PASS.**

An Elysia `App` type crosses a Bun workspace boundary into Eden Treaty clients used by both server-rendered and browser code. Strict compile-time checks preserve the exact response literals and reject unknown routes and invalid assignments. Runtime checks prove the same real HTTP API supplies values to production SSR HTML and to a client-only Chromium route.

The committed spike was reverified with `bun install --frozen-lockfile && bun run verify`. It exited `0` with 6 passing tests, no failures, and 10 assertions. An earlier clean-install verification produced the same result.

**Recommendation:** retain proposed decision D-16. Elysia can own data access while the TanStack web app uses Eden Treaty in both SSR and browser contexts. No replacement or section 4 decision supersession is proposed. This does not complete FND-06 or validate every production API pattern.

## 2. Environment

| Component | Observed version |
|---|---|
| OS | Windows 11, x64 |
| Bun | `1.4.4`, revision `38afee6c84fcf48c0edb2466aa4b27d287a59c30` |
| Elysia | `1.4.31` |
| `@elysiajs/eden` | `1.4.9` |
| TanStack Start | `1.169.4` |
| TanStack Router | `1.170.46` |
| Nitro | `3.0.261103-rc` |
| React / React DOM | `19.3.1` / `19.3.1` |
| Vite | `8.3.5` |
| TypeScript | `7.0.2` |
| Playwright | `1.64.1` |
| Playwright Chromium | `156.0.8078.4` |
| `@types/bun` | `1.4.4` |
| `@types/react` / `@types/react-dom` | `19.3.0` / `19.3.0` |

Spike branch: `spike/m0-eden-treaty`. Spike commit: `39047f2` (`spike(m0): validate Eden Treaty type flow`). All direct dependencies are exact pins in the spike workspace manifests and resolve through the committed `bun.lock`. No dependency was added to the production backend or frontend package.

## 3. Official docs consulted

- [Eden Treaty overview](https://elysiajs.com/eden/treaty/overview): export `type App = typeof app`, pass it to `treaty<App>()`, and access routes through typed properties.
- [Eden Treaty configuration](https://elysiajs.com/eden/treaty/config): configure real URL-backed HTTP clients rather than relying on direct Elysia instances.
- [Elysia handlers](https://elysiajs.com/essential/handler): set response headers through `set.headers`.
- [TanStack Start selective SSR](https://tanstack.com/start/latest/docs/framework/react/guide/selective-ssr): use `ssr: true` for server execution and `ssr: false` for client-only route components.

The implementation uses real URL-backed Treaty clients in both environments. A direct Elysia instance would not prove the browser HTTP boundary, and Eden Fetch was not substituted for the Eden Treaty API named by D-16 and M0.

## 4. Acceptance criteria and evidence

1. **PASS: cross-workspace type inference.** `apps/web/src/lib/api.ts` imports `App` from `@m0-eden/api` and constructs `treaty<App>(baseUrl)`. Strict TypeScript checking passes for both server and browser wrappers.
2. **PASS: exact type-equality checks.** The server and browser wrappers each return `Promise<Proof>`, where `Proof` contains readonly literal fields `message: 'M0_EDEN_TYPED'` and `count: 42`. Type-level equality assertions compare both wrapper results with that exact shape.
3. **PASS: compile-time negative controls.** `@ts-expect-error` directives require TypeScript to reject an unknown route, assignment of the message to `'WRONG_MESSAGE'`, and assignment of the numeric count to `string`. If the client degraded to `any`, these directives would be unused and the type check would fail.
4. **PASS: real Elysia HTTP response.** `GET /proof` returned HTTP `200`, the expected origin header, and `{ "message": "M0_EDEN_TYPED", "count": 42 }`.
5. **PASS: production SSR through Eden Treaty.** The Bun-targeted production server rendered raw HTML containing `<h1>M0_EDEN_TYPED_SSR</h1>`. The heading is derived from `proof.message` returned by the server-side Treaty client, not a hardcoded route marker.
6. **PASS: browser-only fetch and rendering.** Raw `/client-only` HTML excluded `M0_EDEN_TYPED_BROWSER`. Chromium subsequently executed the browser Treaty client, fetched the API value, and displayed `M0_EDEN_TYPED_BROWSER` with no uncaught page errors. This heading is also derived from `proof.message`.
7. **PASS: runtime detector negative controls.** The SSR inclusion detector rejected HTML missing its required marker, and the browser exclusion detector rejected HTML that leaked the client marker into the raw response.
8. **PASS: production build and cleanup.** Client, SSR, and Nitro Bun builds completed. Build output showed an `elysiajs__eden.mjs` chunk. The verifier terminated its API and web process trees, and ports `4312` and `4313` were confirmed free on both `127.0.0.1` and `::1`.

## 5. Commands and verification history

The spike was audited and verified from the repository root with:

```bash
bun run verify
```

That run passed TypeScript, all production builds, and all 6 tests. The clean-install gate removed generated dependencies and output, then ran:

```bash
bun install --frozen-lockfile && bun run verify
```

The clean install and verifier exited `0` with the same 6 passing tests. The spike was then committed as `39047f2` and independently reviewed with no blocking findings.

Before writing these findings, the committed branch was checked out and verified again:

```bash
bun install --frozen-lockfile && bun run verify
```

This rerun also exited `0`. Final test output:

```text
(pass) SSR inclusion detector rejects HTML missing the typed API marker
(pass) browser exclusion detector rejects a marker leaked into raw HTML
(pass) Elysia serves the exact typed payload over real HTTP
(pass) Chromium renders the API value returned to browser Eden Treaty code
(pass) production SSR HTML contains the value loaded through Eden Treaty
(pass) client-only raw HTML does not contain the browser result

6 pass
0 fail
10 expect() calls
Ran 6 tests across 4 files.
```

The acceptance harness predated this findings audit. No pre-implementation RED result was independently observed during the audit, so this document does not claim one. The positive and negative checks above were all executed against the committed implementation.

## 6. Approaches attempted

1. **Real URL-backed Eden Treaty clients:** a separate `@m0-eden/api` workspace exports the Elysia `App` type; the web workspace consumes it in shared, server, and browser modules. The TanStack production server and Chromium each call the real Elysia HTTP server. This passed all acceptance criteria.
2. **Direct Elysia instance or Eden Fetch fallback:** not attempted. A direct instance would bypass the browser HTTP boundary, and Eden Fetch would not test the Treaty API required by this spike. No technology fallback was needed.

## 7. Limitations and unverified items

- **API coverage is intentionally narrow.** The spike proves one unauthenticated GET route with a small literal response. Mutations, request bodies, query parameters, nested routes, validation errors, error unions, streaming, and larger production schemas remain unverified.
- **Production workspace integration remains M1 work.** The manually named `Proof` shape makes the exact assertions readable, while compile-time negative controls guard against an `any` fallback. FND-06 still requires exporting and consuming the real application's `App` type.
- **Deployment configuration was not tested.** The API URL is supplied at build time through `VITE_M0_API_URL`, and CORS allows one exact origin for a simple GET. Production proxying, environment validation, credentialed requests, preflight behavior, HTTPS, Caddy, and separate deployed processes remain untested.
- **Browser coverage is narrow.** Execution used Chromium on Windows. Firefox, WebKit, mobile browsers, and POSIX process-group cleanup were not exercised.
- **Nitro remains a spike-only RC dependency.** The successful Bun build does not accept the Nitro RC as a production dependency or resolve the release risk recorded in the TanStack findings.
- **No data or authentication behavior was exercised.** Database access, sessions, authorization, persistence, and secret handling are outside this spike.
- **No hosted PR checks were part of verification.** The evidence comes from repeated local clean-install and committed-branch verifier runs.

## 8. Spec impact

`None`. `docs/SPEC.md` was not changed. The evidence supports retaining D-16 as proposed; owner acceptance happens through review and merge of the findings PR, not through the spike commit.

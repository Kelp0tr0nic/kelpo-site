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

**Registry discrepancy:** `@elysiajs/eden` resolved to `1.4.9`, while the M0 plan predeclared `1.4.10`. The pins are recorded here as resolved and verified, not as planned. See section 10.

## 3. Official docs consulted

- [Eden Treaty overview](https://elysiajs.com/eden/treaty/overview): export `type App = typeof app`, pass it to `treaty<App>()`, and access routes through typed properties.
- [Eden Treaty configuration](https://elysiajs.com/eden/treaty/config): configure real URL-backed HTTP clients rather than relying on direct Elysia instances.
- [Elysia handlers](https://elysiajs.com/essential/handler): set response headers through `set.headers`.
- [TanStack Start selective SSR](https://tanstack.com/start/latest/docs/framework/react/guide/selective-ssr): use `ssr: true` for server execution and `ssr: false` for client-only route components.

The implementation uses real URL-backed Treaty clients in both environments. A direct Elysia instance would not prove the browser HTTP boundary, and Eden Fetch was not substituted for the Eden Treaty API named by D-16 and M0.

## 4. Acceptance criteria

Each criterion below is the predeclared criterion from the M0 plan for this item, marked only from observed output. The spike used its own workspace, file, route, and marker names, which are given alongside.

1. **PASS — the API exports its `App` type without listening.** Plan: `apps/api/src/app.ts` exports `type App = typeof app` without calling `listen`; only `src/index.ts` starts the server. Spike: `apps/api/src/server.ts` builds and exports the app; `apps/api/src/index.ts` starts it.
2. **PASS — the web app imports that type through its workspace package name, not a relative path into another workspace.** `apps/web/src/lib/api.ts` imports `App` from `@m0-eden/api`, declared as a `workspace:*` dependency, and constructs `treaty<App>(baseUrl)`.
3. **PASS — one shared call path serves both environments.** Plan: a shared `getGreeting` performs `client.api.greeting.get()` and returns a statically inferred `{ message: string }`. Spike: `apps/web/src/lib/api.ts` is shared by `server-proof.ts` and `browser-proof.ts`; it performs `client.api.proof.get()`, and both wrappers return `Promise<Proof>`. `Proof` holds the readonly literals `message: 'M0_EDEN_TYPED'` and `count: 42`, and type-level equality assertions compare both wrapper results against that exact shape.
4. **PASS — SSR output contains the value loaded through Eden Treaty.** Plan: `M0_EDEN_SSR_OK` appears in raw `/ssr` HTML. Spike: the Bun-targeted production server rendered raw HTML containing `<h1>M0_EDEN_TYPED_SSR</h1>`, derived from `proof.message` returned by the server-side Treaty client rather than a hardcoded route marker.
5. **PASS — the browser performs the call after load.** Plan: Chromium loads `/browser`, performs the call, displays `M0_EDEN_BROWSER_OK`, and network traffic proves the request occurred. Spike: raw `/client-only` HTML excluded `M0_EDEN_TYPED_BROWSER`; Chromium then executed the browser Treaty client, fetched the value from the real API, and displayed `M0_EDEN_TYPED_BROWSER` with no uncaught page errors. The heading is likewise derived from `proof.message`.
6. **PASS — `tsc --noEmit` checks both workspaces and includes the invalid-call type test.** Spike: `apps/web/src/lib/type-tests.ts` carries `@ts-expect-error` directives that require TypeScript to reject an unknown route, the assignment of the message to `'WRONG_MESSAGE'`, and the assignment of the numeric count to `string`. If the client degraded to `any`, those directives would be unused and the type check would fail.
7. **NOT RECORDED — the directive-removal typecheck.** Plan: removing the `@ts-expect-error` directive in a temporary copy must produce a non-zero exit, after which the file is restored immediately and the normal typecheck asserted to pass. This run was not observed during the audit, so no result is claimed. The directives in criterion 6 remain load-bearing through TypeScript's unused-directive behavior, which independently fails the build if Eden accepts an invalid call.

Three runtime checks beyond the predeclared criteria were also executed:

8. **PASS — real Elysia HTTP response.** `GET /proof` returned HTTP `200`, the expected origin header, and `{ "message": "M0_EDEN_TYPED", "count": 42 }`.
9. **PASS — runtime detector negative controls.** The SSR inclusion detector rejected HTML missing its required marker, and the browser exclusion detector rejected HTML that leaked the client marker into the raw response.
10. **PASS — production build and cleanup.** Client, SSR, and Nitro Bun builds completed, with build output showing an `elysiajs__eden.mjs` chunk. The verifier terminated its API and web process trees, and ports `4312` and `4313` were confirmed free on both `127.0.0.1` and `::1`.

## 5. Commands

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

This rerun also exited `0`.

## 6. Evidence

Final test output:

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

Real HTTP response from the Elysia API:

```text
GET /proof -> 200
{ "message": "M0_EDEN_TYPED", "count": 42 }
```

Raw production SSR HTML contained:

```html
<h1>M0_EDEN_TYPED_SSR</h1>
```

Raw `/client-only` HTML did not contain `M0_EDEN_TYPED_BROWSER`; Chromium observed that text after load, with an empty uncaught page error list.

Production build output included an `elysiajs__eden.mjs` chunk. Ports `4312` and `4313` were free on `127.0.0.1` and `::1` after cleanup.

Negative-control results: the SSR inclusion detector rejected HTML missing its marker; the browser exclusion detector rejected HTML that leaked the client marker into the raw response.

The acceptance harness predated this findings audit. No pre-implementation RED result was independently observed during the audit, so this document does not claim one. The positive and negative checks above were all executed against the committed implementation.

## 7. Approaches attempted

1. **Real URL-backed Eden Treaty clients:** a separate `@m0-eden/api` workspace exports the Elysia `App` type; the web workspace consumes it in shared, server, and browser modules. The TanStack production server and Chromium each call the real Elysia HTTP server. This passed all acceptance criteria.
2. **Direct Elysia instance or Eden Fetch fallback:** not attempted. A direct instance would bypass the browser HTTP boundary, and Eden Fetch would not test the Treaty API required by this spike. No technology fallback was needed.

## 8. Recommendation

Retain proposed decision D-16. Eden Treaty carries the exported Elysia `App` type across a Bun workspace boundary and produces correctly typed calls from both server-rendered and browser code, with compile-time negative controls that fail the build if the client degrades to `any`. No replacement is proposed.

This does not complete FND-06. That requirement still needs the real application's `App` type exported from `apps/api` and consumed in `apps/web`, plus the deployment-time base URL configuration that this spike supplied through `VITE_M0_API_URL` at build time.

The one predeclared criterion that is not evidenced is the directive-removal typecheck (section 4, criterion 7). The directives are still load-bearing, so the gap is in the recorded evidence rather than in the guarantee itself.

## 9. Spec impact

`None`. `docs/SPEC.md` was not changed. The evidence supports retaining D-16 as proposed; owner acceptance happens through review and merge of the findings PR, not through the spike commit.

## 10. Leftover risks and unverified items

- **No pre-implementation RED result was recorded.** The plan required writing tests before the implementation and capturing the expected failure. Because the harness predated this audit, every check above ran against the committed implementation. A clean pass is therefore not independently corroborated by a failing baseline.
- **The directive-removal typecheck was not run.** Plan criterion 7 asked for a temporary removal of `@ts-expect-error` to confirm a non-zero exit, then immediate restore. See section 4.
- **API coverage is intentionally narrow.** The spike proves one unauthenticated GET route with a small literal response. Mutations, request bodies, query parameters, nested routes, validation errors, error unions, streaming, and larger production schemas remain unverified.
- **Production workspace integration remains M1 work.** The manually named `Proof` shape makes the exact assertions readable, while compile-time negative controls guard against an `any` fallback. FND-06 still requires exporting and consuming the real application's `App` type.
- **Drizzle was not exercised.** Better Auth and this spike used PostgreSQL through a direct `pg` pool. D-07 names Drizzle and remains unverified; see section 4 of the Better Auth findings.
- **Deployment configuration was not tested.** The API URL is supplied at build time through `VITE_M0_API_URL`, and CORS allows one exact origin for a simple GET. Production proxying, environment validation, credentialed requests, preflight behavior, HTTPS, Caddy, and separate deployed processes remain untested.
- **Browser coverage is narrow.** Execution used Chromium on Windows. Firefox, WebKit, mobile browsers, and POSIX process-group cleanup were not exercised.
- **Nitro remains a spike-only RC dependency.** The successful Bun build does not accept the Nitro RC as a production dependency or resolve the release risk recorded in the TanStack findings.
- **No data or authentication behavior was exercised.** Database access, sessions, authorization, persistence, and secret handling are outside this spike.
- **No hosted PR checks were part of verification.** The evidence comes from repeated local clean-install and committed-branch verifier runs.

# M0: TanStack Start production SSR on Bun

## 1. Result

**PASS.**

TanStack Start built a Bun-targeted production server, returned complete HTML for the SSR route, omitted the client-only route component from raw HTML, and rendered that component successfully in Chromium. The final clean-install `bun run verify` exited `0` with 5 passing tests and no failures.

The initial delivery blocker was resolved by creating the public repository at https://github.com/Kelp0tr0nic/kelpo-site, configuring `origin`, and pushing the existing `main`, spike, and findings branches. The owner explicitly approved the one-time initial `main` push required to bootstrap the repository.

**Recommendation:** retain proposed decisions D-04 and D-05 for this SSR use case. The official Nitro Bun preset worked on the first implementation approach; the custom Bun server fallback was not needed. Keep Nitro as a spike-only direct dependency until the owner records its production dependency decision.

## 2. Environment

| Component | Observed version |
|---|---|
| OS | Windows 11, `10.0.26200.9711`, x64 |
| Bun | `1.4.4`, revision `38afee6c84fcf48c0edb2466aa4b27d287a59c30` |
| TanStack Start | `1.169.4` |
| TanStack Router | `1.170.46` |
| Nitro | `3.0.261103-rc` |
| React / React DOM | `19.3.1` / `19.3.1` |
| Vite | `8.3.5` |
| `@vitejs/plugin-react` | `6.2.1` |
| TypeScript | `7.0.2` |
| Playwright | `1.64.1` |
| Playwright Chromium | `156.0.8078.4` |
| `@types/bun` | `1.4.4` |
| `@types/react` / `@types/react-dom` | `19.3.0` / `19.3.0` |

`bun pm why` confirmed the direct Start, Router, and Nitro pins. Start `1.169.4` also depends on Router `1.170.46`.

Spike commit: `cc4f9f7` (`spike(m0): validate TanStack SSR on Bun`). This commit exists on the local `spike/m0-tanstack-ssr` branch.

## 3. Official docs consulted

- [TanStack Start overview](https://tanstack.com/start/latest/docs/framework/react/overview): explicitly states that TanStack Start is stable.
- [Build a project from scratch](https://tanstack.com/start/latest/docs/framework/react/build-from-scratch): root document, router, and route structure.
- [Selective SSR](https://tanstack.com/start/latest/docs/framework/react/guide/selective-ssr): `ssr: true` is the default and `ssr: false` disables server rendering for a route component.
- [TanStack Start hosting](https://tanstack.com/start/latest/docs/framework/react/guide/hosting): lists Bun as a deployment target.
- [Nitro Bun runtime](https://v2.nitro.build/deploy/runtimes/bun): preset `bun` and `bun run ./.output/server/index.mjs`.

The exact patch versions above were pinned in `spikes/m0/tanstack-ssr/package.json` and resolved through the committed `bun.lock`; dependencies were not floated during the spike.

## 4. Acceptance criteria

1. **PASS: production build and Bun-targeted output.** `vite build` completed the client, SSR, and Nitro Bun builds and emitted `.output/server/index.mjs`.
2. **PASS: production output served by Bun.** `scripts/verify.ts` spawned `bun .output/server/index.mjs`, not Node and not a Vite development server. The final run listened on `http://[::1]:4311/`.
3. **PASS: complete SSR HTML.** Raw `GET /server` returned HTTP `200` and contained the exact element `<h1>M0_SERVER_RENDERED</h1>`.
4. **PASS: client-only component absent from raw HTML.** Raw `GET /client-only` returned HTTP `200` and did not contain `<h1>M0_CLIENT_ONLY</h1>`.
5. **PASS: client-only component works in a browser.** Chromium loaded `/client-only`, found the visible heading, and observed its exact text `M0_CLIENT_ONLY`.
6. **PASS: negative controls.** The shared inclusion assertion rejected HTML missing `M0_SERVER_RENDERED`; the exclusion assertion also rejected HTML containing `M0_CLIENT_ONLY`.

No assertion was skipped, removed, or weakened.

## 5. Commands

The spike branch was created from local `main`:

```bash
git switch -c spike/m0-tanstack-ssr main
bun install
```

The acceptance tests and verifier were written before the app routes. After correcting a verifier-only port-probe API error, the required pre-implementation run was:

```bash
bun run verify
```

It exited `1` as expected: `tsc --noEmit` passed, then `vite build` failed with `[UNRESOLVED_ENTRY] Cannot resolve entry module index.html.` The app implementation did not yet exist.

Playwright's pinned Chromium was installed from the spike directory:

```bash
bunx playwright install chromium
```

The final acceptance run was executed from the repository root as one chained command:

```bash
rm -rf node_modules backend/node_modules frontend/node_modules spikes/m0/tanstack-ssr/node_modules spikes/m0/tanstack-ssr/.output && bun install --frozen-lockfile && bun run verify
```

`bun install --frozen-lockfile` installed 138 packages. The subsequent `bun run verify` exited `0`.

The initial spike push was attempted before repository setup:

```bash
git push -u origin spike/m0-tanstack-ssr
```

It exited `128` because `origin` was not configured. After creating the repository, the following commands completed successfully:

```bash
git remote add origin https://github.com/Kelp0tr0nic/kelpo-site.git
git push -u origin main
git push -u origin spike/m0-tanstack-ssr
git push -u origin docs/m0-tanstack-ssr
```

The initial `main` push was explicitly approved by the owner to bootstrap the empty repository. No later changes were pushed to `main`.

## 6. Evidence

Final clean-install verification:

```text
bun test v1.4.4 (38afee6c8)
(pass) SSR inclusion detector rejects HTML missing the marker
(pass) SSR exclusion detector rejects HTML containing the client marker
(pass) client-only route renders its component in Chromium
(pass) production server route returns complete SSR HTML
(pass) client-only route omits its component marker from raw HTML

5 pass
0 fail
6 expect() calls
Ran 5 tests across 3 files.
```

The build emitted `.output/server/index.mjs`, and the server process tree was terminated successfully in the verifier's `finally` block.

Observed raw SSR response excerpt:

```html
HTTP 200
<body><!--$--><h1>M0_SERVER_RENDERED</h1><!--/$-->
```

Observed raw client-only response excerpt:

```html
HTTP 200
<body><!--$--><!--$--><!--/$--><!--/$-->
```

The full client-only response contained no `M0_CLIENT_ONLY` heading. Its serialized route state reported `ssr:!1`, and Chromium subsequently loaded the route chunk and displayed the heading.

The verifier checks both IPv4 and IPv6 port availability, requires the SSR marker during bounded readiness polling, starts its own production server, fails on test or cleanup errors, and awaits process exit after cleanup.

## 7. Approaches attempted

1. **Official Nitro Bun preset:** `tanstackStart()`, `nitro({ preset: 'bun' })`, and `viteReact()` in the documented Vite plugin order. This passed all acceptance criteria.
2. **Custom Bun server:** not attempted because approach one passed. No technology fallback was needed.

The initial port-probe correction and Playwright browser download were verifier/environment setup, not failed implementation approaches.

## 8. Recommendation

M0 item 1 provides positive evidence for TanStack Start `1.169.4` with Bun `1.4.4` and per-route selective SSR. Continue with D-04 and D-05 for the next M0 spike. No section 4 decision supersession is proposed by this result.

## 9. Spec impact

`None`. `docs/SPEC.md` was not changed, as requested.

## 10. Leftover risks and unverified items

- **CI:** no CI configuration exists in this checkout, so hosted PR checks are not available. Remote repository and branch delivery were verified separately.
- **Nitro release risk:** the tested direct pin is an RC build dependency. It worked here, but this does not make it an accepted production dependency.
- **Platform coverage:** execution was on Windows with Chromium only. The verifier includes POSIX process-group cleanup, but that path was not exercised.
- **Deployment behavior:** local production output was tested, not a deployed VPS, Caddy, HTTPS, environment validation, or container packaging.
- **Scope:** this spike proves SSR and per-route client-only rendering only. It does not prove Eden type flow, auth, Tiptap, database behavior, or any M1+ requirement.

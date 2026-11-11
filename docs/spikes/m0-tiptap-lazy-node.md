# M0: Custom Tiptap node with a lazy client island

## 1. Result

**PASS via approach 2, a hydration-gated client island.**

A custom `orbitCard` Tiptap node rendered meaningful React HTML on the production server. Its interactive component arrived in a separate dynamic-import chunk only after hydration, mounted successfully, and produced no browser errors. The deliberately mismatched route proved that the same error collector detects hydration failures.

The final clean-install `bun run verify` exited `0` with 4 passing tests, no failures, and 22 assertions. Independent pre-commit review found no blocking findings.

**Recommendation:** retain proposed decision D-09, but use React's two-pass hydration pattern for interactive custom nodes. Do not use approach 1's `typeof window` render branch. SSR and the hydration render should return the same plain shell; an effect can then enable the lazy Suspense island. No section 4 decision supersession is required.

## 2. Environment

| Component | Observed version |
|---|---|
| OS | Windows 11, `10.0.26200.9711`, x64 |
| Bun | `1.4.4`, revision `38afee6c84fcf48c0edb2466aa4b27d287a59c30` |
| Tiptap Core / React / StarterKit / Static Renderer / PM | `3.30.3` for every direct dependency |
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

Spike branch: `spike/m0-tiptap-lazy-node`. Spike commit: `ab093cdca498ad4ec0f6f2ef98b2b1919028be7a` (`spike(m0): validate lazy Tiptap custom nodes`). All direct dependencies are exact pins in the spike manifest and resolve through its committed root `bun.lock`. `bun pm why` confirmed `@tiptap/static-renderer@3.30.3`. No dependency was added to the production backend or frontend package.

## 3. Official docs consulted

- [Tiptap Static Renderer](https://tiptap.dev/docs/editor/api/utilities/static-renderer): custom React node mappings are explicit; static rendering does not automatically use editor React NodeViews.
- [Tiptap 3.30.3 React renderer source](https://raw.githubusercontent.com/ueberdosis/tiptap/v3.30.3/packages/static-renderer/src/pm/react/react.ts): confirmed `renderToReactElement` and its pinned argument and return types.
- [Tiptap 3.30.3 static renderer option types](https://raw.githubusercontent.com/ueberdosis/tiptap/v3.30.3/packages/static-renderer/src/json/renderer.ts): `NodeProps` supplies a ProseMirror `node`, optional parent and children, and `renderElement`.
- [Tiptap 3.30.3 JSON React exports](https://raw.githubusercontent.com/ueberdosis/tiptap/v3.30.3/packages/static-renderer/src/json/react/index.ts): confirmed the public `NodeProps` type export.
- [Tiptap 3.30.3 extension renderer](https://raw.githubusercontent.com/ueberdosis/tiptap/v3.30.3/packages/static-renderer/src/pm/extensionRenderer.ts): custom mappings override default node rendering while the extension remains necessary for schema construction.
- [React `hydrateRoot`](https://react.dev/reference/react-dom/client/hydrateRoot): initial client output must match SSR; the documented two-pass pattern sets client-only state in an effect after hydration.
- [React error 418](https://react.dev/errors/418): identified a `typeof window` render branch as a direct cause of the observed hydration mismatch.
- [React `lazy`](https://react.dev/reference/react/lazy): declare the lazy component at module scope; its loader runs when React first attempts to render it.
- [React `useEffect`](https://react.dev/reference/react/useEffect): effects do not run during server rendering, enabling the stable initial render followed by client-only mounting.
- [Vite 8.3.5 manifest documentation](https://raw.githubusercontent.com/vitejs/vite/v8.3.5/docs/guide/backend-integration.md): dynamic-import entries use their source path as the manifest key and have `isDynamicEntry: true`.

## 4. Acceptance criteria and evidence

1. **PASS: semantic custom-node SSR.** Raw production `GET /post` returned HTTP `200`. After removing script elements, the response contained `<section data-orbit-card="orbitCard" data-client-mounted="false"><h2>M0_ORBIT_NODE_SSR</h2><p>M0_ORBIT_LABEL</p></section>`. A negative helper test rejected a response containing the marker only inside a script.
2. **PASS: custom node and React static mapping.** The fixture contains `type: 'orbitCard'`; `OrbitNode` is an atom with that name. The isomorphic post route calls `renderToReactElement` from `@tiptap/static-renderer/pm/react` with `extensions: [StarterKit, OrbitNode]` and `options: { nodeMapping: { orbitCard: OrbitNodeView } }`.
3. **PASS: lazy import and separate chunk.** `OrbitNodeView` declares `lazy(() => import('../components/orbit-card'))` at module scope. The production manifest maps `src/components/orbit-card.tsx` to `assets/orbit-card-CvQh6jrK.js` with `isDynamicEntry: true`.
4. **PASS: no initial preload, then browser request and mount.** No initial script or link resource tag referenced the Orbit chunk. Chromium subsequently requested it once after the main and post chunks. The component then set `data-client-mounted="true"` while preserving the SSR heading and label.
5. **PASS for the interactive island, with an approach-2 wording distinction.** SSR and the initial hydration render intentionally return the plain `OrbitCardShell`. The first effect-enabled interactive render uses `Suspense` with `fallback={<OrbitCardShell {...props} />}`. While Playwright held the lazy response, the live element's `outerHTML` was exactly equal to the SSR shell. The lazy component's first render also returns that shell with `clientMounted` initially `false`; only effects change the hydrated and mounted state. Thus the literal initial hydration render does not itself contain a Suspense boundary, unlike the approach-1-specific wording of this criterion.
6. **PASS: clean real-route error capture.** `/post` produced no `pageerror` or `console.error`. The collector listened for every error, including hydration errors 418, 423, 425, and text mismatches, without a whitelist.
7. **PASS: hydration negative control.** `/negative-hydration` deterministically rendered `M0_HYDRATION_SERVER` on the server and `M0_HYDRATION_CLIENT` in the browser. The same collector observed React error 418 with the `text` argument, proving detection works.

## 5. Commands and verification history

The branch was created from `main` at `5439344d353e55e54f380f8354b0504a89fc8075`:

```bash
git switch -c spike/m0-tiptap-lazy-node main
bun install
```

The acceptance tests and verifier were written before the application. The required pre-implementation run was:

```bash
bun run verify
```

It exited `1` as expected. TypeScript passed, then Vite failed with:

```text
Error: Could not resolve entry for router entry: router in .../spikes/m0/tiptap-lazy-node/src
```

Approach 1 built and rendered the lazy component, but its verifier exited `1`: `/post` produced minified React error 418 with the `HTML` argument. The separate negative route also produced error 418 with the `text` argument, as intended.

Approach 2 replaced only the render-time environment branch with React's documented two-pass hydration gate. Its unchanged verifier passed. A stronger browser check then held the lazy response, asserted exact equality between the live fallback and SSR shell, released the response, and verified mounting. That run passed 4 tests with 22 assertions.

The final clean-install gate removed generated dependencies and output, then ran:

```bash
rm -rf node_modules backend/node_modules frontend/node_modules spikes/m0/tiptap-lazy-node/node_modules spikes/m0/tiptap-lazy-node/.output && bun install --frozen-lockfile && bun run verify
```

The frozen install installed 189 packages. `bun run verify` exited `0` with this final result:

```text
4 pass
0 fail
22 expect() calls
Ran 4 tests across 1 files.
```

The verifier type-checked, built all client/SSR/Nitro targets, started the Bun production server on port `4351`, required the semantic Orbit shell during bounded readiness polling, ran all tests, terminated the process tree, and confirmed the port was free on both `127.0.0.1` and `::1`.

A staged security scan passed, `git diff --cached --check` passed, and independent review returned `passed: true` with no security concerns or logic errors.

## 6. Evidence

Observed raw SSR article:

```html
<article><section data-orbit-card="orbitCard" data-client-mounted="false"><h2>M0_ORBIT_NODE_SSR</h2><p>M0_ORBIT_LABEL</p></section></article>
```

Manifest entry:

```text
src/components/orbit-card.tsx
file: assets/orbit-card-CvQh6jrK.js
isDynamicEntry: true
```

Initial resource tags referenced the main and post chunks, not the Orbit chunk:

```text
/assets/index-50XlxkIJ.js
/assets/post-4Iom3R1P.js
```

Observed Chromium script request order:

```text
1. /assets/index-50XlxkIJ.js
2. /assets/post-4Iom3R1P.js
3. /assets/orbit-card-CvQh6jrK.js
```

Before the third response was released, the test asserted:

```text
live orbit outerHTML === ORBIT_SHELL
```

After release, it observed HTTP `200` for the Orbit chunk, exactly one request for that chunk, `data-client-mounted="true"`, and:

```json
{
  "errors": []
}
```

The separate negative route produced:

```text
pageerror: Minified React error #418; ...?args[]=text&args[]=
```

That expected negative-route error was not ignored or whitelisted in the `/post` test.

## 7. Approaches attempted

1. **Render-time `typeof window` branch with immediate Suspense on the client.** The server returned `OrbitCardShell`; the first client render returned `Suspense` around `LazyOrbitCard`. Although the fallback markup matched, the React trees differed. Production Chromium reported hydration error 418 with the `HTML` argument, so this approach failed.
2. **Hydration-gated client island.** SSR and the hydration render both return the plain shell. An effect then enables the Suspense/lazy subtree. This follows React's documented two-pass pattern and passed the unchanged verifier. It is an island boundary inside the existing hydrated tree, not a separate `createRoot` call.

No third approach was attempted.

## 8. Recommendation

Use approach 2 for future interactive Tiptap custom nodes. Keep the shell eagerly imported and shared by SSR, the Suspense fallback, and the lazy component's initial render. Defer the lazy subtree until an effect after hydration, and defer visible mounted-state changes to effects.

Continue with D-09. This result supports custom Tiptap nodes for future lab embeds and does not require a Lexical fallback. Tiptap code is allowed in this spike's public chunks; the no-editor-bundle requirement belongs to item 4 and BLOG-03, not this interactive-node boundary.

## 9. Spec impact

`None`. `docs/SPEC.md` was not changed. Approach 2 replaces the planned implementation boundary, not a section 4 technology decision. Owner acceptance happens through review and merge of this findings PR, not through the spike commit.

## 10. Leftover risks and unverified items

- **Criterion 5 needs owner awareness.** The plan's literal wording says the first client render uses a Suspense fallback. Approach 2's first hydration render is the plain shell; its first interactive render uses the identical Suspense fallback. This distinction is intentional and is not hidden behind a test change.
- **This is not a full lab lifecycle.** Mount, resize, pause, resume, dispose, GPU cleanup, reduced motion, keyboard or touch controls, and real WebGL/WebGPU behavior remain M6 work.
- **Content coverage is narrow.** One atom node with one deterministic label was tested. Multiple nodes, nested content, marks, dynamic labels, editor updates, client navigation, and untrusted stored JSON were not exercised.
- **Security remains M4 work.** Schema validation, allow-listed nodes and attributes, safe URLs, and handling untrusted content are not implemented by this fixed-fixture spike.
- **Bundle isolation differs from item 4.** This spike allows Tiptap and ProseMirror in public chunks. It proves code splitting for the interactive component, not exclusion of the editor from public pages.
- **Optional transitive versions were not aligned.** The planned direct `@tiptap/react@3.30.3` package pulls optional menu extensions at `3.33.1` in the lockfile, whose peers request newer core/PM packages. Those optional menus were not executed. Production dependency alignment should be reviewed before adopting the full package set.
- **Browser and platform coverage is narrow.** Execution used Chromium on Windows. Firefox, WebKit, mobile browsers, and POSIX process-group cleanup were not exercised.
- **Deployment behavior was not tested.** Caddy, HTTPS, caching, deployed VPS behavior, and production content persistence remain outside this spike.
- **No hosted CI checks were part of verification.** The evidence comes from the local RED run, both implementation approaches, the clean-install final verifier, static scans, and independent reviews.

# M0: Tiptap server rendering without public editor bundles

## 1. Result

**PASS against the planned M0 HTML-string acceptance criteria.**

Tiptap JSON rendered to real HTML in the production Bun SSR response. Chromium loaded two public JavaScript chunks, and both their source maps and emitted JavaScript passed the enforced scan for Tiptap and ProseMirror code. Tiptap remained in the server bundle.

The final clean-install `bun run verify` exited `0` with 14 passing tests, no failures, and 18 assertions. Independent pre-commit review found no remaining blocking findings.

**Recommendation:** retain proposed decision D-09 for this server-rendering boundary. Use Tiptap's Static Renderer through a narrowly scoped server function, keeping renderer imports in `.server.ts` files. No replacement or section 4 decision supersession is proposed. This does not complete BLOG-03 or establish the production security design for stored post content.

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

Spike branch: `spike/m0-tiptap-rendering`. Spike commit: `0e1335de5ce56d379e1adbfbdf5f5e78892ffffb` (`spike(m0): validate Tiptap server rendering`). All direct dependencies are exact pins in the spike manifest and resolve through its committed root `bun.lock`. `bun pm why` confirmed `@tiptap/core@3.30.3` and `@tiptap/static-renderer@3.30.3`. No dependency was added to the production backend or frontend package.

## 3. Official docs consulted

- [Tiptap Static Renderer](https://tiptap.dev/docs/editor/api/utilities/static-renderer): `renderToHTMLString` accepts JSON and extensions without a DOM or editor instance; import it from `@tiptap/static-renderer/pm/html-string`.
- [Tiptap Static Renderer changelog](https://tiptap.dev/docs/resources/changelog/static-renderer): consulted for the pinned release line.
- [Tiptap 3.30.3 HTML-string implementation](https://raw.githubusercontent.com/ueberdosis/tiptap/v3.30.3/packages/static-renderer/src/pm/html-string/html-string.ts): checked the exact rendering API and escaping boundary.
- [Tiptap 3.30.3 Static Renderer package exports](https://raw.githubusercontent.com/ueberdosis/tiptap/v3.30.3/packages/static-renderer/package.json): confirmed the `pm/html-string` export in the tested version.
- [TanStack Start 1.169.4 server functions](https://raw.githubusercontent.com/TanStack/router/%40tanstack/react-start%401.169.4/docs/start/framework/react/guide/server-functions.md): `createServerFn` provides the RPC boundary for server-only handlers called by isomorphic loaders.
- [TanStack Start 1.169.4 import protection](https://raw.githubusercontent.com/TanStack/router/%40tanstack/react-start%401.169.4/docs/start/framework/react/guide/import-protection.md): the `.server.ts` suffix protects server-only imports during production compilation.
- [TanStack Start execution model](https://tanstack.com/start/latest/docs/framework/react/guide/execution-model): route loaders are isomorphic, so the renderer must not be called directly from a loader.

## 4. Acceptance criteria and evidence

1. **PASS: production SSR renders real markup.** Raw `GET /post` returned HTTP `200` with `<h2>M0_TIPTAP_SERVER_HTML</h2>` and `<p>M0_TIPTAP_PARAGRAPH <strong>M0_TIPTAP_BOLD</strong></p>` from the JSON fixture.
2. **PASS: the server uses Static Renderer.** `src/post/render.server.ts` calls `renderToHTMLString({ extensions: [StarterKit], content })` from `@tiptap/static-renderer/pm/html-string`. It does not instantiate an `Editor` or require a browser DOM.
3. **PASS: actual browser-loaded chunks are recorded.** Playwright loaded `/post`, observed the server-rendered heading and bold text, and recorded both production JavaScript responses needed by the route. Uncaught page errors were required to be empty.
4. **PASS: every chunk is mapped and checked.** The scanner mapped each URL to its emitted file under `.output/public` and read its source map. It rejects forbidden source-map sources and explicit emitted-JavaScript package markers. Empty chunk lists, empty JavaScript, missing source lists, unreadable chunks, and missing or invalid maps fail rather than producing a vacuous pass.
5. **PASS: public chunks exclude Tiptap and ProseMirror.** Neither browser-loaded chunk contained matching source-map entries or package markers. Tiptap chunks were observed only in the Nitro server output.
6. **PASS: scanner negative controls.** The same artifact-checking function used for browser artifacts accepted a clean fixture and rejected `@tiptap/core`, `prosemirror-model`, package-root variants of both paths, and explicit `@tiptap/` and `prosemirror-` JavaScript markers. Filesystem tests proved unreadable chunks and missing maps fail. All asynchronous rejection assertions are awaited.

## 5. Commands and verification history

The branch was created from `main` at `5439344d353e55e54f380f8354b0504a89fc8075`:

```bash
git switch -c spike/m0-tiptap-rendering main
bun install
```

The acceptance tests, scanner, and verifier were written before the application. The required pre-implementation run was:

```bash
bun run verify
```

It exited `1` as expected. TypeScript passed, then Vite failed with:

```text
Error: Could not resolve entry for router entry: router in .../spikes/m0/tiptap-rendering/src
```

After the minimal implementation, the verifier passed. Independent review then identified missing scanner controls. New tests for alternative source paths and empty JavaScript were run before the scanner fix and produced three expected failures. The scanner was tightened without weakening any assertion, and all 11 scanner tests passed.

The final clean-install gate removed generated dependencies and output, then ran:

```bash
rm -rf node_modules backend/node_modules frontend/node_modules spikes/m0/tiptap-rendering/node_modules spikes/m0/tiptap-rendering/.output && bun install --frozen-lockfile && bun run verify
```

The frozen install installed 189 packages. `bun run verify` exited `0` with this final result:

```text
14 pass
0 fail
18 expect() calls
Ran 14 tests across 3 files.
```

The verifier type-checked, built all client/SSR/Nitro targets, started the Bun production server on port `4341`, required the rendered post during bounded readiness polling, ran all tests, terminated the process tree, and confirmed the port was free on both `127.0.0.1` and `::1`.

A staged security scan passed, `git diff --cached --check` passed, and the final independent reviewer returned `passed: true` with no security concerns, logic errors, or suggestions.

## 6. Evidence

Observed raw SSR article:

```html
<article><h2>M0_TIPTAP_SERVER_HTML</h2><p>M0_TIPTAP_PARAGRAPH <strong>M0_TIPTAP_BOLD</strong></p></article>
```

Chromium recorded and the scanner accepted exactly these two public chunks:

```text
.output/public/assets/index-DFbzqlYF.js
.output/public/assets/index-DFbzqlYF.js.map
.output/public/assets/post-B4DTKFIS.js
.output/public/assets/post-B4DTKFIS.js.map
```

The client build emitted `.output/public/.vite/manifest.json` and source maps. The post chunk's map contained only `src/routes/post.tsx?tsr-split=component`. The main chunk's map included React, Router, Start client code, the route, and the server-function client stub, but no Tiptap or ProseMirror source. The scanner also read both browser-loaded emitted JavaScript files and rejected explicit editor package markers.

The server build separately emitted Tiptap artifacts including `_libs/tiptap__static-renderer.mjs`, `_libs/tiptap__starter-kit.mjs`, and Tiptap extension chunks. These server artifacts were observed in build output; the automated exclusion assertion applies to the browser-loaded public chunks listed above.

## 7. Approaches attempted

1. **Static Renderer behind `createServerFn`:** the fixed JSON fixture and all Tiptap imports live in `render.server.ts`. The server-function handler alone references the renderer, and the route loader calls that function. This passed on the first implementation approach.
2. **Alternative server-only middleware/loader boundary:** not attempted because approach one passed. Scanner control fixes were test-harness corrections, not a second technology approach.

## 8. Recommendation

Continue with D-09 and use Static Renderer for public post HTML. Keep the renderer behind a server-only module and a narrow server-function boundary. This rendering-only server function does not reverse D-16: it performs no data access or business logic and is not a second backend.

Keep Nitro as a spike-only direct dependency until its production dependency decision is recorded separately.

## 9. Spec impact

`None`. `docs/SPEC.md` was not changed. The evidence supports retaining D-09 as proposed; owner acceptance happens through review and merge of this findings PR, not through the spike commit.

## 10. Leftover risks and unverified items

- **Untrusted content is out of scope.** The fixture is fixed and trusted. M4 still needs JSON schema validation, allow-listed nodes and links, safe URL handling, and a production rendering approach that never injects untrusted stored HTML.
- **Custom nodes and hydration are unproven.** M0 item 5 must independently prove custom-node rendering, lazy loading, and hydration behavior.
- **HTML-string and React-element rendering are distinct.** Section 7 of the spec uses the phrase "rendered on the server to React," while the item 4 plan explicitly requires `renderToHTMLString` and real server HTML. This spike follows that planned HTML-string contract inside a server-rendered React route. It does not claim to prove `renderToReactElement`; item 5 separately uses that API for the custom-node boundary.
- **Extension coverage is narrow.** Only a heading, paragraph, text, and bold mark were rendered. Code blocks, links, lists, images, custom marks, and editor-specific plugin behavior were not exercised.
- **Client navigation was not independently tested.** The route uses `createServerFn` for the isomorphic loader boundary, but the browser evidence comes from initial production page load rather than a subsequent client-side navigation.
- **Source-map evidence is required.** The production scan intentionally fails if maps or sources are unavailable. Deployed public source-map exposure and its operational implications were not evaluated.
- **Browser and platform coverage is narrow.** Execution used Chromium on Windows. Firefox, WebKit, mobile browsers, and POSIX process-group cleanup were not exercised.
- **Deployment behavior was not tested.** Caddy, HTTPS, caching, deployed VPS behavior, and production content persistence remain outside this spike.
- **No hosted CI checks were part of verification.** The evidence comes from the local RED run, targeted scanner checks, clean-install final verifier, static scans, and independent reviews.

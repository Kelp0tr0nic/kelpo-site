# M0: Better Auth handler, sessions, and passkeys in Elysia

## 1. Result

**PASS.**

Better Auth's real handler mounted successfully in Elysia. Server-side `auth.api.getSession` accepted a valid passkey-backed session and rejected missing and invalid cookies. Chromium registered a passkey through Playwright's virtual authenticator, signed out, and used that credential to authenticate from a fresh browser context with no existing session.

The final clean-install `bun run verify` exited `0` with 5 passing tests, no failures, and 21 assertions. A subsequent verification of committed spike `76eb20d` produced the same result.

**Recommendation:** retain proposed decision D-08. Better Auth is suitable for the Elysia integration and passkey flow tested here. No replacement is needed and no section 4 decision supersession is proposed. This does not complete the production authentication requirements in M3.

## 2. Environment

| Component | Observed version |
|---|---|
| OS | Windows 11, x64 |
| Bun | `1.4.4`, revision `38afee6c84fcf48c0edb2466aa4b27d287a59c30` |
| Better Auth | `1.7.18` |
| `@better-auth/passkey` | `1.7.18` |
| Elysia | `1.4.31` |
| `pg` | `8.23.1` |
| PostgreSQL | `16.15`, `postgres:16-alpine` |
| PostgreSQL image digest | `sha256:0cefaabd882e42bcb2a2f3dc56d3ce4770560ba62fd7f197f1a2e008fd5731ab` |
| Docker Engine / Desktop | `29.6.1` / `4.80.0` |
| Playwright | `1.64.1` |
| Playwright Chromium | `156.0.8078.4` |
| TypeScript | `7.0.2` |
| Vite | `8.3.5` |

Spike branch: `spike/m0-better-auth`. Spike commit: `76eb20d` (`spike(m0): validate Better Auth passkeys with Elysia`). All direct npm dependencies are exact pins in `spikes/m0/better-auth/package.json` and resolve through the committed `bun.lock`. No dependency was added to the production backend or frontend package.

## 3. Official docs consulted

- [Better Auth Elysia integration](https://better-auth.com/docs/integrations/elysia): mount `auth.handler` and pass request headers to `auth.api.getSession`.
- [Better Auth passkey plugin](https://better-auth.com/docs/plugins/passkey): configure `passkey()` and `passkeyClient()`, then use `addPasskey()` and `signIn.passkey()`.
- [Better Auth PostgreSQL adapter](https://better-auth.com/docs/adapters/postgresql): pass a `pg.Pool` directly to Better Auth.
- [Better Auth programmatic migrations](https://better-auth.com/docs/concepts/database#programmatic-migrations): use `getMigrations(auth.options)` and `runMigrations()` with the built-in PostgreSQL adapter.
- [Better Auth installation](https://better-auth.com/docs/installation): configure the base URL, a secret of at least 32 characters, a database, and the authentication handler.
- [Playwright Credentials API](https://playwright.dev/docs/api/class-credentials): install a virtual authenticator, capture registered credentials, and seed them into another browser context.

The installed `1.7.18` passkey typings were also checked directly for the client return shapes and server options.

## 4. Acceptance criteria and evidence

1. **PASS: strict TypeScript and production browser build.** `tsc --noEmit` passed. Vite transformed 68 modules and emitted `dist/index.html` and a self-contained `dist/client.js`.
2. **PASS: mounted Better Auth handler.** Anonymous `GET /api/auth/get-session` returned HTTP `200` and JSON `null` through the handler mounted by Elysia.
3. **PASS: server-side session rejection.** Requests to the Elysia `/session` route with no cookie and with `better-auth.session_token=definitely-invalid` each returned HTTP `401` and `{ "error": "M0_NO_SESSION" }`.
4. **PASS: genuine virtual passkey registration.** The browser completed authenticated bootstrap and `authClient.passkey.addPasskey()`. Playwright initially observed zero credentials for `localhost`, then exactly one after registration. The UI reached `M0_PASSKEY_REGISTERED`.
5. **PASS: sign-out and clean login boundary.** The UI reached `M0_SIGNED_OUT`, after which `/session` returned `401`. A new browser context had no cookies and its `/session` request also returned `401` before authentication.
6. **PASS: passkey login and server session lookup.** The captured credential was seeded into the fresh context. `authClient.signIn.passkey({ autoFill: false })` reached `M0_PASSKEY_LOGIN_OK`; `/session` then returned HTTP `200`, `M0_SESSION_OK`, and `m0-passkey@example.test`. The session cookie was HttpOnly.
7. **PASS: negative control and browser health.** The response-marker detector rejected a missing marker. Both browser contexts reported no uncaught page errors.
8. **PASS: owned-resource cleanup.** The verifier terminated its Elysia process tree and removed only its PID-unique PostgreSQL container. Ports `4314` and `4315` were free on both `127.0.0.1` and `::1`, and no `kelpo-m0-better-auth-*` container remained.

Email/password sign-up was enabled only to create the authenticated user required for passkey registration. It is disposable test scaffolding, not a recommendation to permit public sign-up in the product.

## 5. Commands and process

The branch was created directly from up-to-date `main` at `5439344`:

```bash
git switch -c spike/m0-better-auth main
bun install
```

The acceptance tests and verifier were written before the application. The required pre-implementation run was:

```bash
bun run verify
```

It exited `1` as expected: TypeScript passed, then Vite failed with `[UNRESOLVED_ENTRY] Cannot resolve entry module index.html.` No application or database process had started.

After implementation, one TypeScript nullability error in the browser status element was corrected without changing any test. The complete verifier then passed. The final clean-install gate was:

```bash
rm -rf node_modules backend/node_modules frontend/node_modules spikes/m0/better-auth/node_modules spikes/m0/better-auth/dist && bun install --frozen-lockfile && bun run verify
```

The frozen install installed 109 packages. The verifier built the browser client, started a disposable PostgreSQL container, applied migrations, started Elysia, ran all tests, and cleaned up every owned resource.

After commit `76eb20d`, `bun run verify` was run once more before findings delivery and again exited `0`.

Final test output:

```text
(pass) response marker detector rejects a missing marker
(pass) virtual passkey registers and logs in from a fresh browser context
(pass) mounted Better Auth handler returns no session to an anonymous request
(pass) Elysia session lookup rejects a missing session cookie
(pass) Elysia session lookup rejects an invalid session cookie

5 pass
0 fail
21 expect() calls
Ran 5 tests across 3 files.
```

Migration evidence:

```text
M0 migrations: 5 tables to create, 0 tables to update
```

The tables were Better Auth's `user`, `session`, `account`, `verification`, and `passkey` tables.

## 6. Approaches attempted

1. **Official Better Auth integration with direct PostgreSQL pool:** mounted `auth.handler`, configured `passkey()`, used programmatic migrations, and called `auth.api.getSession` in an Elysia route. A same-origin Vite-built vanilla client avoided adding React or CORS behavior unrelated to this spike. Playwright's current Credentials API performed both WebAuthn ceremonies. This passed all acceptance criteria.
2. **Fallback integration:** not attempted because the first implementation approach passed. The TypeScript nullability correction was an implementation fix, not a second technology approach.

## 7. Limitations and unverified items

- **Production authentication remains unproven.** This spike does not implement or verify one-owner provisioning, disabled public sign-up, recovery, TOTP, session expiration, route-discovery authorization tests, or the other M3 requirements.
- **Drizzle was not exercised.** The spike used Better Auth's supported direct `pg.Pool` adapter to isolate the auth boundary. AUTH-01's specific Better Auth, PostgreSQL, and Drizzle combination still needs verification during M3.
- **Rate limiting needs production configuration.** Better Auth warned that it could not determine a client IP and used a shared per-path bucket. Trusted proxy/IP behavior and AUTH-07 were not tested.
- **Schema initialization ordering matters.** Better Auth logged the expected missing-table diagnostic during initialization immediately before programmatic migrations created the tables. Production migrations must run before the application starts, as required by OPS-03; this spike does not validate deployment ordering.
- **WebAuthn negative cases were not exercised.** Cancelled ceremonies, invalid origins, replayed assertions, counter anomalies, multiple credentials, and physical authenticator behavior remain untested.
- **Browser coverage is narrow.** Execution used Chromium on Windows with a virtual authenticator. Firefox, WebKit, mobile platforms, real hardware keys, and platform biometrics were not tested.
- **Cookie coverage is limited.** The test proved an HttpOnly session cookie. Secure and SameSite attributes, expiry, and re-login behavior required by AUTH-04 and AUTH-08 were not fully verified.
- **Harness negative control is bounded.** `tests/acceptance.test.ts` checks the standalone response-marker helper, not the verifier's separate readiness predicate. The positive integration tests still exercise the real readiness and authentication boundaries.
- **Process cleanup has a bounded warning path.** On Windows, a `taskkill` error can be superseded if the direct child subsequently exits. This server spawns no descendants, and the verifier separately requires all owned ports to become free. POSIX process-group cleanup was not exercised.
- **No deployment behavior was tested.** HTTPS, Caddy, secure production cookies, persistent database storage, backups, and deployed VPS behavior are outside this local spike.

## 8. Spec impact

`None`. `docs/SPEC.md` was not changed. The evidence supports retaining D-08 as proposed; owner acceptance happens through review and merge of the findings PR, not through the spike commit.

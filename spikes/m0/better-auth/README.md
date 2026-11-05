# M0 Better Auth and Elysia spike

## Question

Can Better Auth's handler and server-side session lookup work inside Elysia, including a passkey registration and login performed through a Playwright virtual authenticator?

## Research brief

- [Better Auth's Elysia integration](https://better-auth.com/docs/integrations/elysia) documents mounting `auth.handler` and passing request headers to `auth.api.getSession`.
- [Better Auth's passkey plugin](https://better-auth.com/docs/plugins/passkey) documents `passkey()`, `passkeyClient()`, `addPasskey()`, and `signIn.passkey()`.
- [Better Auth's PostgreSQL adapter](https://better-auth.com/docs/adapters/postgresql) documents passing a `pg.Pool` directly to Better Auth.
- [Programmatic migrations](https://better-auth.com/docs/concepts/database#programmatic-migrations) documents `getMigrations(auth.options)` and `runMigrations()` for the built-in PostgreSQL adapter.
- [Playwright's Credentials API](https://playwright.dev/docs/api/class-credentials) documents installing a virtual WebAuthn authenticator, capturing a registered credential, and seeding it into a fresh browser context.

Chosen approach: use Better Auth `1.7.18` and `@better-auth/passkey` `1.7.18` with Elysia `1.4.31` and real PostgreSQL through `pg` `8.23.1`. A Vite-built vanilla browser client uses `better-auth/client` and `passkeyClient()`. Playwright `1.64.1` provides the virtual authenticator. All direct dependencies are pinned and belong only to this spike workspace.

Email/password sign-up is enabled only to create the authenticated user required for passkey registration. It is test scaffolding, not a proposal to enable public sign-up in the product.

## Acceptance checks

1. Strict TypeScript and the production browser build pass.
2. The mounted Better Auth handler answers an anonymous `GET /api/auth/get-session` request with no session.
3. An Elysia route using `auth.api.getSession` rejects both missing and invalid session cookies with HTTP `401` and `M0_NO_SESSION`.
4. Chromium uses an installed virtual authenticator to create a real passkey after authenticated bootstrap; Playwright observes exactly one stored credential for `localhost`.
5. After sign-out, the protected Elysia route returns `401`. A fresh browser context starts with no cookies or session.
6. The captured credential is seeded into the fresh context, `signIn.passkey()` succeeds, and the protected Elysia route returns HTTP `200`, `M0_SESSION_OK`, and the expected user email.
7. The browser flow emits no uncaught page errors, the authenticated session cookie is HttpOnly, and all server, browser, and container resources are cleaned up.

Run all checks with `bun run verify` from this directory or the repository root. Docker Desktop must be running. The verifier owns application port `4314`, database port `4315`, and a uniquely named disposable PostgreSQL 16 container. It starts its own processes, runs programmatic migrations, and cleans up every resource in `finally`.

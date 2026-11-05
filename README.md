# kelpo-site

A resume site: an Elysia (Bun) API serves the resume data, and a React (Vite) frontend renders it.

## Run it

```bash
bun install          # once, at the repo root (installs both workspaces)
bun run dev          # starts backend :3000 and frontend :5173 together
```

Open http://localhost:5173. Hit http://localhost:3000/api/resume to see the raw API.

Prefer separate terminals: `bun run dev:backend` and `bun run dev:frontend`.
`bun run build` type-checks and produces `frontend/dist`.

## Why this shape

- **Bun** is both the runtime and the package manager, so there is one tool instead of node + npm + ts-node. TypeScript runs directly, no build step on the server.
- **Elysia** is built for Bun. Routes infer their types from the handler return values, so the API stays a few lines long.
- **Vite + React** owns the UI. In dev, Vite proxies `/api/*` to Bun (`vite.config.ts`), so the browser only talks to one origin and no CORS config is needed.
- All personal data lives in one plain data file, `backend/src/resume.json`. It travels over HTTP instead of being hard-coded in the UI, so edit that one file and the UI picks it up. `resume.ts` holds only the TypeScript shape, no personal values.

## Layout

```
backend/src/index.ts      Elysia app: /api/health, /api/resume
backend/src/resume.json   ALL personal data (edit this)
backend/src/resume.ts     Resume type contract only, no personal values
frontend/src/App.tsx     fetches /api/resume and renders the sections
frontend/src/types.ts    client-side mirror of the server's Resume type
frontend/vite.config.ts  /api proxy -> localhost:3000
```

## Next steps

- Serve `frontend/dist` from Elysia in production with `@elysiajs/static` so one process handles everything.
- Replace the duplicated `types.ts` with a shared workspace, or use Elysia Eden (`@elysiajs/eden`) to infer the client types straight from `export type App = typeof app` in `backend/src/index.ts`.
- Add a contact form endpoint, or move resume data into a file/DB.

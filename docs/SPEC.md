# Personal Site: Product and Technical Spec

| | |
|---|---|
| **Owner** | Kelp |
| **Spec status** | Draft: decisions marked *Proposed* await owner review |
| **Current milestone** | M0 |
| **Last updated** | 2026-11-04 |

## 1. Purpose

A long-lived personal platform that serves as:

1. A **resume**: who I am and what I've done.
2. A **blog**: posts written in the browser and stored in my own database.
3. A **project repository**: links to and write-ups of my work.
4. A **technical showcase**: built with modern tools, with room for graphically ambitious simulations and games.

The site should stay easy to return to. Adding a post, project, theme, or experiment should not require rework elsewhere.

### Goals

- Publish from any browser without touching code or redeploying.
- Reuse a personal component library with a distinctive visual identity.
- Add or stow themes without touching feature code.
- Add new features as self-contained modules.
- Keep the operating burden low enough for one person.

### Non-goals

Do not build these unless a new decision is recorded in section 4:

- Multiple authors, roles, or public sign-up
- Real-time collaborative editing
- Comments, likes, or paid subscriptions
- Microservices, Kubernetes, or multi-region infrastructure
- A plugin system for third parties

---

## 2. How to use this spec

### Tracking status

Each requirement is a checkbox with a stable ID and a milestone:

```md
- [ ] **AREA-01** (M4) Requirement text
```

- `[ ]` not done, `[x]` done and verified, `[~]` in progress, `[-]` dropped (say why in the changelog)
- IDs are never reused or renumbered. New requirements get the next free number.
- Find a milestone's work by searching for its tag, such as `(M3)`.

### Rules for agents

1. Follow `AGENTS.md`. Read sections 1 to 5 before starting. Work only on what you were assigned.
2. Make the smallest change that satisfies the requirement. Do not refactor unrelated code.
3. Check current official documentation before using a library API, and do not guess from memory.
4. Mark a requirement `[x]` only after its behavior has been verified. Say how in the changelog.
5. Treat *Accepted* decisions as settled. Build on *Proposed* decisions as defaults until M0 tests them or the owner changes them. If a decision seems wrong, raise it with the owner rather than working around it.
6. Ask before adding a production dependency that this spec does not name, then record the decision.
7. Do anything listed under Non-goals only after the owner approves it.
8. Update the header, the checkboxes, and the changelog in the same PR as the work. Later batches build on merged work, so wait for the owner to merge dependencies.

---

## 3. Architecture

```text
                      Internet
                         |
                 Caddy (HTTPS, routing)
                  /                 \
              /*  |                 |  /api/*
                  v                 v
      apps/web (React SSR)  --->  apps/api (Elysia on Bun)
                                      |            \
                                      v             v
                                 PostgreSQL    Object storage
                                               (images)
```

### Rendering by route

| Route | Mode | Why |
|---|---|---|
| `/`, `/resume`, `/projects`, `/projects/:slug`, `/blog`, `/blog/:slug` | Server-rendered | Search engines and link previews need complete HTML |
| `/admin/**` | Client-only, `noindex` | Private, and keeps editor code out of public pages |
| `/lab` | Server-rendered index | Experiments can be discovered and shared |
| `/lab/:slug` | Server-rendered shell, client-only canvas | WebGL and WebGPU only run in the browser |

Serving the frontend and API from one origin keeps auth cookies simple and avoids CORS.

### Repository layout

```text
apps/
  web/                 # React app: routes and page composition
    src/features/      # blog, projects, resume, admin, lab
  api/                 # Elysia app; exports `type App` for Eden
    src/modules/       # auth, posts, projects, media, health
packages/
  db/                  # Drizzle schema and migrations
  ui/                  # Theme-agnostic component library
  themes/              # One directory per theme
  post-content/        # Post schema, Tiptap extensions, and post renderer
  lab-core/            # Experiment contract and lifecycle helpers
docs/
  SPEC.md
  spikes/              # M0 findings
AGENTS.md              # Agent working rules
```

**Dependency direction:** `apps` may import `packages`. `packages/ui` must not import from `apps`, and features must not import from each other. Shared code moves into a package.

### Core data model

Better Auth owns its own tables. Column names below show intent and are finalized in `packages/db`.

| Table | Key fields |
|---|---|
| `posts` | `id`, `slug` (unique), `title`, `subtitle`, `excerpt`, `content` (JSONB), `status` (`draft` or `published`), `published_at`, `updated_at`, `cover_media_id`, `seo_title`, `seo_description`, `version` |
| `post_revisions` | `id`, `post_id`, `title`, `content`, `created_at` |
| `post_slug_redirects` | `old_slug` (unique), `post_id` |
| `tags`, `post_tags` | Tag name and slug; many-to-many join |
| `projects` | `id`, `slug`, `title`, `summary`, `body` (JSONB), `repo_url`, `live_url`, `tech` (text array), `featured`, `sort_order`, `visible`, `cover_media_id` |
| `media` | `id`, `storage_key`, `mime_type`, `width`, `height`, `bytes`, `alt`, `created_at` |

A post scheduled for later is simply `status = published` with a future `published_at`. Public queries filter on `published_at <= now()`, so scheduling needs no background job.

### API surface

Routes sit under `/api/v1`, except the feed and sitemap, which are served from the site root. TypeBox schemas validate each route. The React app uses Eden Treaty for typed calls.

| Method and path | Access | Purpose |
|---|---|---|
| `GET /health` | Public | Liveness and database check |
| `/auth/*` | Public | Better Auth handler |
| `GET /posts`, `GET /posts/:slug` | Public | Published posts only |
| `GET /projects`, `GET /projects/:slug`, `GET /tags` | Public | Visible projects and tags |
| `GET,POST /admin/posts` | Owner | List all posts, create a draft |
| `GET,PATCH,DELETE /admin/posts/:id` | Owner | Read, autosave, delete |
| `POST /admin/posts/:id/publish`, `/unpublish` | Owner | Change publication state |
| `GET,POST /admin/posts/:id/revisions`, `POST .../:revisionId/restore` | Owner | Revision history |
| `POST,DELETE /admin/media` | Owner | Upload and remove images |
| `GET,POST,PATCH,DELETE /admin/projects` | Owner | Manage projects |
| `GET /feed.xml`, `GET /sitemap.xml` | Public | Feed and sitemap |

---

## 4. Decisions

Change a decision by adding a row that supersedes it. Do not rewrite history.

| ID | Decision | Status | Reason | Fallback or revisit trigger |
|---|---|---|---|---|
| D-01 | TypeScript throughout | Accepted | Owner choice | None |
| D-02 | Elysia for the backend | Accepted | Owner choice; readable API and typed client | None |
| D-03 | React for the frontend | Accepted | Owner choice | None |
| D-04 | Bun runtime and workspaces | Proposed | Elysia is designed around Bun | Run `apps/web` on Node if M0 finds a Bun SSR problem |
| D-05 | TanStack Start for SSR | Proposed | Per-route SSR control fits section 3, strong route typing, satisfies the appetite for newer tools | React Router framework mode if M0 fails |
| D-06 | Separate web and API processes | Proposed | Keeps a real backend and clear boundary | None planned |
| D-07 | PostgreSQL with Drizzle | Proposed | Relational data, JSONB content, typed queries, SQL-visible migrations | None planned |
| D-08 | Better Auth with one owner account | Proposed | Handles sessions and passkeys without hand-rolled security | Revisit if the integration proves heavier than the single-user need |
| D-09 | Tiptap for the editor; ProseMirror JSON stored | Proposed | Headless, so it can match the site's style; custom nodes support embeds | Lexical if M0 finds a blocker |
| D-10 | Do not use Tiptap's paid platform services | Proposed | Collaboration and hosted features are out of scope | None planned |
| D-11 | Tailwind v4 mapped to semantic CSS variables | Proposed | Fast authoring with runtime themes | CSS Modules with the same tokens |
| D-12 | Headless accessible primitives (Base UI or React Aria, chosen in M2) | Proposed | Avoids rebuilding focus and keyboard behavior | Choose during M2 |
| D-13 | One VPS: Docker Compose and Caddy | Proposed | Elysia suits a long-running server; costs are predictable | Managed container host if operations become a burden |
| D-14 | S3-compatible object storage for images | Proposed | Keeps binaries out of the database and off the VPS disk | None planned |
| D-15 | Three.js for the first 3D work | Proposed | Mature ecosystem; owner interest | Choose per experiment; the lab contract is library-agnostic |
| D-16 | Elysia owns data access and business logic; the web app calls it through Eden, not TanStack server functions | Proposed | Avoids two competing backend layers and keeps the framework replaceable | Revisit only if M0 finds SSR data loading unworkable |

### Dependency policy for newer tools

Trying new tools is part of the purpose of this site, but they should not put written content at risk.

- Commit the lockfile and update dependencies deliberately, with automated PRs.
- Keep posts in a documented JSON format and exportable to Markdown.
- Keep framework-specific code in routes, and business logic in API modules and packages.
- Use experimental features freely inside `/lab`, and only with a recorded decision elsewhere.

---

## 5. Open questions

Defaults apply until the owner decides otherwise.

| ID | Question | Default |
|---|---|---|
| Q-01 | What domain will the site use? | Needed before M1 deployment |
| Q-02 | Which VPS and object storage provider? | Compare price and region during M1 |
| Q-03 | Should email subscriptions be offered, like Substack? | RSS at launch; email stays in the backlog |
| Q-04 | Should resume content be edited in admin? | Typed file in the repo until editing it there becomes annoying |
| Q-05 | Which analytics, if any? | None until M4, then a privacy-respecting tool |
| Q-06 | What is the visual direction of the first theme? | Owner creates a short moodboard at the start of M2 |
| Q-07 | Should the repo be public? | Public, since it doubles as a portfolio piece; check for secrets before publishing |

---

## 6. Requirements

### 6.1 Foundation

- [ ] **FND-01** (M1) Create the Bun workspace with the layout in section 3.
- [ ] **FND-02** (M1) Enable strict TypeScript with a shared base config.
- [ ] **FND-03** (M1) Add one formatter and linter, enforced in CI.
- [ ] **FND-04** (M1) Validate environment variables at startup and fail with a clear message. Commit `.env.example`.
- [ ] **FND-05** (M1) Provide one command that starts the web app, API, and database locally.
- [ ] **FND-06** (M1) Export the API `App` type and consume it in `apps/web` through Eden Treaty.
- [ ] **FND-07** (M1) Return API errors in one consistent shape and request-validation failures as `422`.
- [ ] **FND-08** (M1) Manage schema changes with committed Drizzle migrations. Production must never use schema push.
- [ ] **FND-09** (M1) Write a README covering local setup, deployment, and restore.
- [ ] **FND-10** (M1) Implement `GET /api/v1/health` with a database check.
- [ ] **FND-11** (M1) Add a placeholder home page that reads a value from the database through the API.

### 6.2 Design system

- [ ] **UI-01** (M2) Define semantic tokens for color, type, spacing, radius, shadow, and motion. Components use semantic tokens only, such as `--color-surface`, never raw palette values.
- [ ] **UI-02** (M2) Organize `packages/ui` into primitives (Button, Input, Dialog), patterns (Card, Tag list, Page header), and layouts (Stack, Grid, Prose).
- [ ] **UI-03** (M2) Components must not know about features or fetch data.
- [ ] **UI-04** (M2) Add a component catalog, as a dev-only route or Storybook, showing variants and states under each theme.
- [ ] **UI-05** (M2) All primitives support keyboard use, visible focus, and WCAG 2.2 AA contrast.
- [ ] **UI-06** (M2) All motion respects `prefers-reduced-motion`.
- [ ] **UI-07** (M2) Layouts work from 320px wide with no horizontal page scroll.
- [ ] **UI-08** (M2) Build the site shell: navigation, footer, 404 page, and error page.

### 6.3 Themes

A theme is a directory containing tokens and, optionally, a few component overrides. A **stowed** theme stays in the repo but is not offered to visitors or loaded by the site.

- [ ] **THM-01** (M2) Build the first theme in `packages/themes/<name>/` with a typed manifest: `id`, `label`, `status` (`active` or `stowed`), and supported color modes.
- [ ] **THM-02** (M2) Apply themes through `data-theme` on `<html>`.
- [ ] **THM-03** (M2) Support light, dark, and system modes, stored in a cookie so that server-rendered HTML has no theme flash.
- [ ] **THM-04** (M5) Load each theme's CSS on demand. A visitor downloads only the active theme, verified in the production build.
- [ ] **THM-05** (M5) Add named override slots, such as `Hero` or `PageBackground`, loaded through dynamic imports. A theme with no override falls back to the default component.
- [ ] **THM-06** (M5) Add a visitor theme switcher listing only `active` themes.
- [ ] **THM-07** (M5) Build a second, deliberately different theme to prove the system. Fix any feature code that needed changes to support it.
- [ ] **THM-08** (M5) Stowing a theme requires changing only its manifest status. Stowed themes stay available in the component catalog.
- [ ] **THM-09** (M5) Add a test that checks every theme for all required tokens.

### 6.4 Resume and projects

- [ ] **RES-01** (M2) Store resume content in a typed file: summary, experience, skills, education, and links.
- [ ] **RES-02** (M2) Build a semantic `/resume` page.
- [ ] **RES-03** (M2) Add a print stylesheet that produces a clean PDF through the browser's print dialog.
- [ ] **RES-04** (M2) Build a home page with a short introduction, featured projects, and space for recent posts.
- [ ] **RES-05** (M2) Add an owner-written section about my interests outside the resume. Do not invent personal content; use placeholders until the owner supplies it.
- [ ] **PRJ-01** (M2) Create the `projects` table and public API, with seed data.
- [ ] **PRJ-02** (M2) Build `/projects` with cards, repo and live links, and filtering by technology.
- [ ] **PRJ-03** (M2) Build `/projects/:slug` for projects with a write-up.
- [ ] **PRJ-04** (M4) Manage projects in admin: create, edit, reorder, feature, and hide.
- [ ] **PRJ-05** (Backlog) Optionally pull stars and last-updated dates from GitHub, cached server-side.

### 6.5 Authentication and admin

- [ ] **AUTH-01** (M3) Integrate Better Auth into Elysia using PostgreSQL through Drizzle.
- [ ] **AUTH-02** (M3) Disable public sign-up. Create the owner through a one-time CLI seed command.
- [ ] **AUTH-03** (M3) Provide a passkey login, with password and TOTP as the recovery route.
- [ ] **AUTH-04** (M3) Use `HttpOnly`, `Secure`, `SameSite=Lax` session cookies.
- [ ] **AUTH-05** (M3) Protect all `/api/v1/admin/**` routes with one server-side guard. Frontend route guards are only for user experience.
- [ ] **AUTH-06** (M3) Test that every admin route returns `401` with no session. The test should discover routes automatically, so new routes cannot be missed.
- [ ] **AUTH-07** (M3) Rate-limit login attempts.
- [ ] **AUTH-08** (M3) Add a non-public login page and logout, and expire sessions with clear re-login behavior that does not lose unsaved editor work.
- [ ] **AUTH-09** (M3) Build a client-only `/admin` shell, split from the public bundle and marked `noindex`.
- [ ] **AUTH-10** (M3) Document account recovery, including what to do if the passkey device is lost.

### 6.6 Editor

Target experience: a calm writing page similar to Substack, where the document looks close to the published post.

- [ ] **EDT-01** (M4) Define the post schema and Tiptap extensions in `packages/post-content`, shared by the editor, API, and renderer.
- [ ] **EDT-02** (M4) Support title, subtitle, H2 to H4, bold, italic, inline code, links, lists, blockquotes, and dividers.
- [ ] **EDT-03** (M4) Add fenced code blocks with a language selector and syntax highlighting.
- [ ] **EDT-04** (M4) Add a selection toolbar and a `/` command menu for inserting blocks.
- [ ] **EDT-05** (M4) Add Markdown shortcuts, such as `##` and `- `, and clean up content pasted from other sites.
- [ ] **EDT-06** (M4) Insert images by file picker, drag and drop, or paste, with required alt text and optional captions.
- [ ] **EDT-07** (M4) Autosave 2 seconds after typing stops, with a visible state: Saving, Saved, or Failed.
- [ ] **EDT-08** (M4) Use the post's `version` to reject stale saves. If two tabs conflict, keep the local copy and warn rather than overwriting.
- [ ] **EDT-09** (M4) Keep an unsaved local copy when offline or logged out, and offer to restore it.
- [ ] **EDT-10** (M4) Save a revision at most every 10 minutes while content changes, and on every publish. Allow previewing and restoring revisions.
- [ ] **EDT-11** (M4) Add a settings panel for slug, excerpt, tags, cover image, SEO fields, and publish date.
- [ ] **EDT-12** (M4) Provide a preview that uses the public post renderer, not an approximation.
- [ ] **EDT-13** (M4) Add a dashboard for all posts with status, dates, search, and new, edit, and delete actions. Deleting requires confirmation.
- [ ] **EDT-14** (M4) Add publish, unpublish, and schedule actions with confirmation.
- [ ] **EDT-15** (M6) Add a custom node that embeds a lab experiment in a post.
- [ ] **EDT-16** (Backlog) Add math blocks, footnotes, and embeds for video and social posts.

### 6.7 Media

- [ ] **MED-01** (M4) Accept uploads through an owner-only API, limited to 10 MB per file and to JPEG, PNG, WebP, and AVIF.
- [ ] **MED-02** (M4) Check the actual file type, generate a random storage key, and strip EXIF metadata, including location data.
- [ ] **MED-03** (M4) Generate responsive WebP or AVIF variants and store dimensions, to prevent layout shift.
- [ ] **MED-04** (M4) Serve images with long-lived cache headers from a CDN-capable URL.
- [ ] **MED-05** (M4) Warn before deleting an image that a post or project still uses.

### 6.8 Public blog

- [ ] **BLOG-01** (M4) Build `/blog` with pagination and tag filtering, showing published posts only.
- [ ] **BLOG-02** (M4) Build `/blog/:slug` with full server-rendered content.
- [ ] **BLOG-03** (M4) Render stored JSON through the renderer in `packages/post-content`. Public pages must not load the editor, verified by bundle analysis.
- [ ] **BLOG-04** (M4) Show reading time, publication date, and updated date when meaningful, plus tags.
- [ ] **BLOG-05** (M4) Add an anchored table of contents for posts with three or more headings, and a copy button on code blocks.
- [ ] **BLOG-06** (M4) Redirect old slugs with a `301` when a published slug changes.
- [ ] **BLOG-07** (M4) Hide drafts and future-dated posts from pages, feeds, sitemaps, and the public API, with tests covering each.
- [ ] **BLOG-08** (M4) Cache published pages and invalidate them on publish, edit, or unpublish.
- [ ] **BLOG-09** (M4) Add a command that exports all posts to Markdown and JSON.
- [ ] **BLOG-10** (Backlog) Add full-text search with PostgreSQL.
- [ ] **BLOG-11** (Backlog) Add email subscriptions. See Q-03.

### 6.9 SEO and sharing

- [ ] **SEO-01** (M2) Give every public page a title, description, canonical URL, and Open Graph tags.
- [ ] **SEO-02** (M2) Publish `robots.txt`, excluding `/admin`.
- [ ] **SEO-03** (M4) Generate `sitemap.xml` and an RSS feed from published content.
- [ ] **SEO-04** (M4) Add `Article` structured data to posts.
- [ ] **SEO-05** (M4) Generate default share images from post titles.

### 6.10 Lab: simulations and games

**Deferred:** do not build experiments before M6. The earlier milestones only need to avoid blocking this work, by keeping the `/lab` route name free and keeping graphics libraries out of shared bundles.

- [ ] **LAB-01** (M6) Define a manifest in `packages/lab-core`: `slug`, `title`, `summary`, `tech`, `thumbnail`, `status`, required capabilities, and a dynamic `load()` import.
- [ ] **LAB-02** (M6) Define a lifecycle contract: `mount`, `resize`, `pause`, `resume`, and `dispose`. It must not assume a specific graphics library.
- [ ] **LAB-03** (M6) Build a host that pauses when off-screen or in a hidden tab and releases GPU resources on exit.
- [ ] **LAB-04** (M6) Build a `/lab` gallery with thumbnails and server-rendered metadata.
- [ ] **LAB-05** (M6) Show a useful fallback when WebGL or WebGPU is unavailable. With reduced motion enabled, do not autoplay.
- [ ] **LAB-06** (M6) Keep each experiment in its own chunk, loaded only on its page or embed. Add a CI check that public non-lab pages contain no graphics libraries.
- [ ] **LAB-07** (M6) Require keyboard or touch controls where interaction is essential, a pause control, and a short "how it works" section.
- [ ] **LAB-08** (M6) Ship one Three.js experiment end to end to prove the contract.
- [ ] **LAB-09** (Backlog) Explore WebGPU, compute shaders, physics simulations, and browser games.

### 6.11 Security

- [ ] **SEC-01** (M1) Keep secrets out of the repo, and run secret scanning in CI.
- [ ] **SEC-02** (M1) Force HTTPS and set HSTS, `X-Content-Type-Options`, and `Referrer-Policy`.
- [ ] **SEC-03** (M3) Add a Content Security Policy. Allow only what each route needs.
- [ ] **SEC-04** (M3) Restrict state-changing requests to the site's own origin.
- [ ] **SEC-05** (M4) Validate post JSON against the schema on save. Render only allow-listed nodes, and never inject stored HTML.
- [ ] **SEC-06** (M4) Allow only `http`, `https`, and `mailto` link URLs in post content.
- [ ] **SEC-07** (M1) Audit dependencies in CI and fail on high-severity vulnerabilities with a fix available.

### 6.12 Quality

- [ ] **QA-01** (M1) Run type checks, lint, tests, and a build on every PR.
- [ ] **QA-02** (M1) Test API modules with `bun:test` against a real PostgreSQL instance.
- [ ] **QA-03** (M2) Add Playwright smoke tests for each public page, including automated accessibility checks.
- [ ] **QA-04** (M4) Add an end-to-end test: log in, write a post, upload an image, publish, view it logged out, then unpublish.
- [ ] **QA-05** (M2) Enforce performance budgets in CI on server-rendered public pages: Lighthouse performance and accessibility of at least 90, LCP under 2.5s, CLS under 0.1, and initial JavaScript under 150 KB gzipped.

### 6.13 Operations

- [ ] **OPS-01** (M1) Package the web app and API as containers and run the stack with Docker Compose.
- [ ] **OPS-02** (M1) Terminate HTTPS and route traffic with Caddy.
- [ ] **OPS-03** (M1) Deploy from `main` through CI, run migrations before the new version starts, and document how to roll back.
- [ ] **OPS-04** (M1) Back up PostgreSQL daily to storage outside the VPS, and keep at least 14 days.
- [ ] **OPS-05** (M1) Perform and document a test restore. Repeat it every six months.
- [ ] **OPS-06** (M1) Write structured logs and rotate them.
- [ ] **OPS-07** (M1) Add external uptime monitoring against `/api/v1/health`, with alerts to the owner.
- [ ] **OPS-08** (M1) Keep images and database data in durable storage that survives redeploys.
- [ ] **OPS-09** (M2) Enable automated dependency PRs, grouped weekly.
- [ ] **OPS-10** (M3) Add error tracking for the web app and API.

---

## 7. Milestones

Each milestone ends with something usable. The public site launches at M2 and improves from there, so it never depends on finishing a large build first.

### M0: Prove the risky stack

Throwaway spikes with no production polish. M0 has no requirement IDs because its output is decisions.

**Before starting:** The agent's environment has git, `gh`, Bun, Docker or a local PostgreSQL, and Playwright browsers.

**For each item:** Use a fresh session and a `spike/m0-<topic>` branch. Stop after two failed approaches. Record the versions tested, commands run, result, and recommendation in `docs/spikes/m0-<topic>.md`.

**Confirm that:**

1. TanStack Start builds and serves a production SSR app in the chosen runtime, with per-route client-only pages. Also confirm its current release status in the official docs.
2. Eden Treaty types flow across workspaces, in both browser and server-rendered code.
3. Better Auth's handler and session lookup work in Elysia, including a passkey login tested with a Playwright virtual authenticator.
4. Tiptap JSON can be rendered on the server to React without bundling the editor for public pages.
5. A custom Tiptap node can render a lazy-loaded client-only component in a server-rendered post.

**Exit:** Each item passes or has a recommended replacement. The agent proposes changes to section 4 in a PR, and the owner accepts them by merging it.

### M1: Deployed skeleton

**Owner provides:** Domain and DNS (Q-01), VPS and object storage (Q-02), and production secrets in the CI and server settings. Agents do not need these values until batch 3.

**Suggested batches, each merged before the next:**

1. FND-01, FND-02, FND-03, FND-05, QA-01, SEC-01, SEC-07
2. FND-04, FND-06, FND-07, FND-08, FND-10, FND-11, QA-02
3. FND-09, OPS-01, OPS-02, OPS-06, OPS-08, SEC-02
4. OPS-03, OPS-04, OPS-05, OPS-07, with the owner performing production steps

**Exit:** A placeholder page on the real domain reads a value from the API and database. Pushing to `main` deploys it. A backup has been restored successfully.

### M2: Public launch

**Exit:** The resume, home page, and projects are live with the first theme, and the site is good enough to put on a job application.

### M3: Secure admin

**Exit:** The owner can log in from a browser to an empty admin area. Automated tests show that every admin route rejects anonymous requests.

### M4: Writing and publishing

**Exit:** The owner writes and publishes a real post from the browser without touching code, and it appears correctly in search-friendly HTML, RSS, and link previews.

### M5: Theme system

**Exit:** Two very different themes run without feature code knowing about either. One can be stowed by changing its manifest.

### M6: Lab

**Exit:** A Three.js experiment appears at its own page and inside a blog post, while non-lab pages stay within budget.

### Backlog

Items tagged `(Backlog)` above, plus ideas not yet specified:

- Public changelog or "now" page
- Notes or short posts alongside long essays
- Reading list or bookmarks
- Privacy-respecting analytics (Q-05)
- Downloadable generated resume PDF

Promote an idea by giving it a requirement ID and a milestone.

---

## 8. Extension recipes

**Add a page or feature:** Create `apps/web/src/features/<name>/`, add an API module if needed, compose from `packages/ui`, and add at least one smoke test.

**Add a component:** Add it to the right tier in `packages/ui`, use semantic tokens only, and add it to the catalog.

**Add a theme:** Copy the template in `packages/themes/`, provide all tokens, add override slots only where needed, and set the manifest status.

**Add a lab experiment:** Create a directory with a manifest and a lifecycle implementation, register it in the lab index, and check its performance on a mid-range device.

**Add a post block:** Add the node to `packages/post-content`, including its editor view, schema validation, and public renderer.

---

## 9. Changelog

Record completed requirements, how they were verified, and changes to scope.

| Date | Change | Verified by |
|---|---|---|
| 2026-11-04 | Initial spec drafted | Owner review pending |
| 2026-11-04 | Pre-handoff review: added D-16, FND-10, FND-11, RES-05, M0 process, M1 batches and owner inputs; made EDT-07, EDT-10, MED-01, and BLOG-05 measurable | Owner review pending |

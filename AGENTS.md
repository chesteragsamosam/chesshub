## Project Configuration

- **Language**: None
- **Package Manager**: pnpm
- **Add-ons**: eslint, prettier, vitest, tailwindcss, better-auth, mcp, drizzle

---

## Auth skills

ChessHub **app login** is Better Auth (`src/lib/server/auth.js`): email/password plus optional **Google** social login.

- Config: `src/lib/server/auth.js`, `src/lib/server/auth-social.js`
- UI: `/login`, `/register` (`SocialLoginButtons.svelte`); Google button renders when `GOOGLE_CLIENT_ID/SECRET` exist
- Env: `GOOGLE_CLIENT_ID/SECRET` (see `.env.example` and README Authentication)
- Callback: `{ORIGIN}/api/auth/callback/google`
- **Facebook Login is postponed** (do not wire `FACEBOOK_*` into Better Auth until Meta OAuth is revisited)

Do **not** fold Lichess or Chess.com into Better Auth `socialProviders`. Those OAuth flows only link chess profiles into `chess_account`, not ChessHub identity.

---

## Lichess skills

When working on Lichess OAuth, ratings, Arena/Swiss standings, or API clients, use the **lichess-api** skill (`.agents/skills/lichess-api/`) and the OpenAPI mirror `Lichessorg API reference.json`.

When working on organizer guides, prize rules, payout holds, advertising, or fair-play event policy, use the **lichess-events** skill (`.agents/skills/lichess-events/`) sourced from `LichessEventTips.txt`.

---

## Chess.com linking

Chess.com account linking uses Chess.com OAuth 2.0 + PKCE (`src/lib/server/chess/chesscom.js`):

- Env: `CHESSCOM_CLIENT_ID`, optional `CHESSCOM_CLIENT_SECRET`
- Redirect URI: `{ORIGIN}/api/chess/chesscom/callback`
- Routes: `/api/chess/chesscom/start`, `/api/chess/chesscom/callback`
- Scopes: `openid profile`
- Without Client ID, settings falls back to username lookup via the public API (not confirmed)

---
You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

## Available Svelte MCP Tools:

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.

---

## Cursor Cloud specific instructions

The update script (`pnpm install` + `pnpm exec playwright install chromium`) already refreshes Node deps and the vitest browser. Everything below is durable run/startup context that is NOT handled by the update script.

### Database (MySQL via Docker)

- The DB is MySQL from `compose.yaml`, reached at `mysql://root:mysecretpassword@localhost:3306/local`. The app throws at boot if `DATABASE_URL` is unset.
- Docker is installed but there is no systemd here, so the daemon is not auto-started. Start it once per session (backgrounded, e.g. in a tmux session): `sudo dockerd`. The `ubuntu` user is in the `docker` group, so `docker`/`pnpm db:start` work without sudo after the daemon is up.
- Start the DB with `pnpm db:start` (foreground `docker compose up`) or `docker compose up -d`. Wait for readiness: `docker exec workspace-db-1 mysqladmin ping -uroot -pmysecretpassword`.
- `pnpm db:push` (drizzle-kit) is **interactive** — it prompts to confirm statements and errors out without a TTY. Run it in a real terminal (e.g. tmux) and select "Yes, I want to execute all statements".

### Environment file

- `.env` is gitignored. If missing, `cp .env.example .env` and set `BETTER_AUTH_SECRET` to a random string (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`). `DATABASE_URL` and `ORIGIN` defaults in `.env.example` already match local dev. All OAuth/Maps/PayMongo vars are optional feature flags — the app runs with email/password auth without them.

### Seed data / login

- `pnpm db:seed` creates 300 mock players plus admin `admin@chesshub.local` / `ChessHubAdmin1!` (mock players: `mock-001..300@chesshub.local` / `MockPlayer1!`). Use `SEED_FORCE=1 pnpm db:seed` to re-seed.

### Run / test / lint

- Dev server: `pnpm dev` → `http://localhost:5173`.
- Tests: `pnpm test` (vitest; the `client` project runs in a real Playwright chromium browser, hence the browser install).
- `pnpm lint` (`prettier --check . && eslint .`) currently reports pre-existing prettier formatting drift and eslint errors on the repo as-is; the tooling itself runs fine.

---
name: lichess-api
description: >-
  Guides Lichess.org API integration: base URL, rate limits, NDJSON streams,
  OAuth2 PKCE and personal tokens, scopes, Arena/Swiss tournaments, users,
  games, teams, challenges, and bulk pairings. Use when building, modifying,
  or reviewing any Lichess integration — OAuth account linking, fetching ratings,
  importing tournament standings, creating arenas/swiss events, Board/Bot
  play, or calling https://lichess.org/api endpoints. Source of truth:
  `Lichessorg API reference.json` (OpenAPI 2.0.153).
---

# Lichess API

OpenAPI title: **Lichess.org API reference** · version **2.0.153**  
Primary base URL: `https://lichess.org` (dev: `https://lichess.dev`)

Local mirror of the spec: `Lichessorg API reference.json` at the repo root. Prefer project helpers under `src/lib/server/chess/lichess*.js` over ad-hoc clients.

## Critical rules

- **One request at a time.** All endpoints are rate-limited. On HTTP **429**, wait at least **one minute**, then reduce frequency before retrying.
- **Never hardcode tokens** in source, frontend bundles, or client apps. Use env vars / server-only storage. Revoke compromised tokens immediately.
- **Token length:** access tokens and auth codes match `^[A-Za-z0-9_]+$` and may grow; support **at least 512 characters**. Do not rely on prefix conventions.
- **NDJSON:** results/stream endpoints return newline-delimited JSON (`Accept: application/x-ndjson`). Parse line-by-line (see existing `parseLichessNdjson`).
- **Identify the app:** send a clear `User-Agent` (ChessHub already uses `ChessHub/1.0 (tournament platform)`).
- **Least privilege:** request only the OAuth scopes you need. ChessHub account link currently uses `email:read preference:read`.

## Integration routing

ChessHub **app login** is Better Auth (email/password, Google, Meta) — not Lichess. Lichess OAuth here only **links a chess profile** for an already-signed-in ChessHub user.

| Building… | Use | Details |
| --- | --- | --- |
| Link Lichess chess account (after ChessHub login) | OAuth2 Authorization Code + **PKCE S256** | [references/auth.md](references/auth.md) |
| Quick server scripts (no user login) | Personal access token (`Authorization: Bearer …`) | [references/auth.md](references/auth.md) |
| Public user ratings / profile | `GET /api/user/{username}` | [references/users-games.md](references/users-games.md) |
| Logged-in profile | `GET /api/account` | [references/auth.md](references/auth.md) |
| Arena create / info / results | `/api/tournament…` | [references/tournaments.md](references/tournaments.md) |
| Swiss create / info / results | `/api/swiss…` | [references/tournaments.md](references/tournaments.md) |
| Import finished prize standings (ChessHub) | Finished tournament + NDJSON `/results` | [references/tournaments.md](references/tournaments.md) |
| Rate limits & streaming | Wait on 429; NDJSON readers | [references/rate-limits.md](references/rate-limits.md) |

Read the relevant reference file before writing or changing Lichess client code.

## ChessHub conventions

- OAuth start/callback: `src/routes/api/chess/lichess/{start,callback}/+server.js`
- Token exchange + account/ratings: `src/lib/server/chess/lichess.js`
- Arena/Swiss ID normalize, finish check, NDJSON standings, prize match: `src/lib/server/chess/lichess-tournaments.js`
- ChessHub **creates rated Arenas** for organizers via `POST /api/tournament` (`createLichessArena`); Swiss is still linked by pasting an existing ID. Prize import uses **finished** public Arena/Swiss standings.
- Private Arenas use a server-only password **and** a managed `conditions.allowList` of registered players (`syncChessHubTournamentAllowList`).
- Public tournament pages use `arena-live-hub` + SSE (`/api/tournaments/{id}/live`) so many viewers share one Lichess poll; featured games may stream via `/api/stream/game/{id}`.

## Official resources

- Docs / UI: https://lichess.org/api · https://lichess.org/api/ui
- Auth examples: https://github.com/lichess-org/api/blob/master/example/README.md
- Demo apps: https://github.com/lichess-org/api-demo · https://github.com/lichess-org/api-ui
- Databases (games/puzzles/evals): https://database.lichess.org/

## Event policy

When organizing or documenting prize events on Lichess, also follow the **lichess-events** skill (from `LichessEventTips.txt`).

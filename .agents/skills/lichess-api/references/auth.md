# Lichess authentication

In ChessHub, Lichess OAuth is **chess-account linking** (`chess_account`), not app login. Users sign into ChessHub with Better Auth (email/password, Google, or Meta) first, then link Lichess from `/settings/profile`.

## Which method?

| Need | Method |
| --- | --- |
| Signed-in ChessHub user links their Lichess account | Authorization Code Flow with **PKCE** (`S256` only) |
| Server-side scripts as one fixed account | Personal access token |

Unregistered/public OAuth clients are allowed (any unique `client_id`). Refresh tokens are **not** supported. Access tokens are long-lived (about one year) unless revoked.

## Personal access token

1. Generate at https://lichess.org/account/oauth/token
2. Call APIs with `Authorization: Bearer {token}`
3. Never commit tokens; store in env only

Example: `GET https://lichess.org/api/account`

## OAuth2 PKCE (link Lichess account)

1. Generate `code_verifier` and `state`; store server-side (session). Never put `code_verifier` in URLs or abuse `state` to store it.
2. `code_challenge` = Base64URL(SHA-256(`code_verifier`)); `code_challenge_method=S256`
3. Redirect to `GET https://lichess.org/oauth` with:
   - `response_type=code`
   - `client_id`
   - `redirect_uri`
   - `code_challenge` / `code_challenge_method`
   - optional `scope` (space-separated)
   - `state`
4. Exchange at `POST https://lichess.org/api/token` (`application/x-www-form-urlencoded`):
   - `grant_type=authorization_code`
   - `code`, `redirect_uri`, `client_id`, `code_verifier`
5. Revoke with `DELETE https://lichess.org/api/token` (Bearer token)

ChessHub helpers: `getLichessAuthUrl`, `exchangeLichessCode`, `createPkcePair`, `fetchLichessAccount` in `src/lib/server/chess/lichess.js`.

## Scopes

Request the minimum set:

| Scope | Purpose |
| --- | --- |
| `preference:read` / `preference:write` | Preferences |
| `email:read` | Email |
| `engine:read` / `engine:write` | External engines |
| `challenge:read` / `challenge:write` / `challenge:bulk` | Challenges / bulk pairings |
| `study:read` / `study:write` | Studies & broadcasts |
| `tournament:write` | Create/update tournaments |
| `racer:write` | Puzzle races |
| `puzzle:read` / `puzzle:write` | Puzzle activity |
| `team:read` / `team:write` / `team:lead` | Teams |
| `follow:read` / `follow:write` | Following |
| `msg:write` | Private messages |
| `board:play` | Board API |
| `bot:play` | Bot API (bot accounts only) |
| `web:mod` | Moderator tools |

- ChessHub account linking uses: `email:read preference:read tournament:write`.

## Token security

- Keep tokens secret; do not share in public repos or forums.
- Tokens can perform actions within their scopes; the account owner remains responsible.
- If compromised, revoke immediately at https://lichess.org/account/oauth/token

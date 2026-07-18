# ChessHub

Link chess profiles (Lichess, Chess.com, FIDE), discover local tournaments, and pay entry fees with GCash or QR Ph via PayMongo.

## Setup

1. Copy env and fill secrets:

```sh
cp .env.example .env
```

Required:

- `DATABASE_URL` — MySQL connection string
- `ORIGIN` — e.g. `http://localhost:5173`
- `BETTER_AUTH_SECRET` — long random string

Optional:

- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google login
- `PUBLIC_GOOGLE_MAPS_API_KEY` — OTB venue pin (Maps JavaScript + Places + Geocoding)
- `LICHESS_CLIENT_ID` — Lichess chess-account linking (PKCE; no secret)
- `CHESSCOM_CLIENT_ID` / `CHESSCOM_CLIENT_SECRET` — Chess.com chess-account linking (PKCE; secret if Chess.com issued one)
- `PAYMONGO_SECRET_KEY` / `PAYMONGO_WEBHOOK_SECRET` — paid tournament registration (GCash, QR Ph)

2. Start MySQL and sync schema:

```sh
pnpm db:start   # docker compose
pnpm db:push
# If upgrading from Stripe columns locally:
node --env-file=.env scripts/migrate-paymongo.mjs
# If adding Lichess vs OTB modality on an existing DB:
node --env-file=.env scripts/migrate-tournament-modality.mjs
# If adding Facebook to social_link platforms on an existing DB:
node --env-file=.env scripts/migrate-social-facebook.mjs
# If adding Facebook data-deletion request tracking:
pnpm db:migrate-facebook-deletion
# If adding FIDE federation/title columns on chess_account:
pnpm db:migrate-chess-account-fide
# If adding cached ratings columns on chess_account:
pnpm db:migrate-chess-account-ratings
# If adding optional tournament sponsors:
pnpm db:migrate-tournament-sponsors
```

3. Run the app:

```sh
pnpm dev
```

FIDE account linking uses Lichess’s public FIDE mirror (`GET /api/fide/player/{id}`), not HTML scraping. Philippine top-rated on `/players?fideFed=PHI` ranks ChessHub users with a linked FIDE account whose federation is `PHI`.

Ratings are cached on `chess_account` and refreshed when stale: **Lichess / Chess.com daily**, **FIDE monthly**.

- **Profiles / settings** — refresh on view if the cache is past TTL.
- **`/players` leaderboards** — read the DB cache only (consistent snapshot).
- **Cron** — `GET|POST /api/cron/refresh-ratings` with `Authorization: Bearer $CRON_SECRET` refreshes stale accounts sequentially (rate-limit friendly).

On Vercel, [`vercel.json`](vercel.json) schedules that path daily at 04:00 UTC. Set `CRON_SECRET` in the project env. Elsewhere, point any scheduler (or `pnpm ratings:refresh` against a running `ORIGIN`) at the same endpoint.

## Authentication

ChessHub app login uses **Better Auth**:

| Method | Env | Notes |
| --- | --- | --- |
| Email + password | `BETTER_AUTH_SECRET` | Always available |
| Google | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Shown on `/login` and `/register` when both are set |

OAuth redirect URI (must match `ORIGIN`):

- Google: `{ORIGIN}/api/auth/callback/google`

**Facebook Login is postponed** and not wired into Better Auth. Data-deletion routes remain for compliance if Meta login returns later.

### Google Cloud setup

1. Create an OAuth 2.0 Client ID (Web application) in [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Add the authorized redirect URI above.
3. Also add `{ORIGIN}` under **Authorized JavaScript origins** (for the official Google button).
4. Copy Client ID and Client Secret into `.env`.

**Not the same as Lichess / Chess.com linking:** those OAuth flows only link a chess profile into `chess_account` after the user is already signed into ChessHub. They are not ChessHub app login.

### Chess.com OAuth setup

1. Request Chess.com OAuth access via their [developer application form](https://www.chess.com/announcements/view/chess-com-oauth-login-application).
2. In the Chess.com OAuth application, set redirect URI(s) to match `ORIGIN` (one per line, exact match, no wildcards):

   - Local: `http://localhost:5173/api/chess/chesscom/callback`
   - Production: `https://your-domain/api/chess/chesscom/callback`
   - Tunnel (if used): `https://your-tunnel/api/chess/chesscom/callback`

3. Copy Client ID (and Client Secret if provided) into `.env` as `CHESSCOM_CLIENT_ID` / `CHESSCOM_CLIENT_SECRET`.

## Google Maps (OTB venues)

OTB tournaments require a pinned venue before organizers can create or publish them. Set `PUBLIC_GOOGLE_MAPS_API_KEY` (browser key).

1. In [Google Cloud Console](https://console.cloud.google.com/google/maps-apis), create or pick a project.
2. Enable **Maps JavaScript API**, **Places API**, and **Geocoding API**.
3. Create an API key. Under Application restrictions, choose **HTTP referrers** and add:
   - `http://localhost:5173/*` (local)
   - `https://your-domain/*` (production)
4. Optionally restrict the key to those three APIs only.
5. Put the key in `.env` as `PUBLIC_GOOGLE_MAPS_API_KEY` (and in your host’s env for production).

Billing must be enabled on the Google Cloud project (Maps has a monthly free credit). Without this key, organizers cannot post OTB events.

## Seed mock data (local dev)

Creates 300 mock players plus a ready-to-use admin account:

```sh
pnpm db:seed
```

Re-seed from scratch:

```sh
SEED_FORCE=1 pnpm db:seed
```

**Admin login**

| Field    | Value                  |
| -------- | ---------------------- |
| Email    | `admin@chesshub.local` |
| Password | `ChessHubAdmin1!`      |

Mock players use emails `mock-001@chesshub.local` through `mock-300@chesshub.local` with password `MockPlayer1!`.

## First admin (manual)

Alternatively, after registering a user, promote them in MySQL:

```sql
UPDATE user SET role = 'admin' WHERE email = 'you@example.com';
```

## Main routes

| Path                        | Purpose                                                      |
| --------------------------- | ------------------------------------------------------------ |
| `/privacy`                  | Privacy Policy                                               |
| `/data-deletion`            | User data deletion instructions (Meta)                       |
| `/data-deletion/status`     | Facebook deletion request status                             |
| `/login`                    | Email/password + Google/Meta sign-in                         |
| `/register`                 | Email/password + Google/Meta sign-up                         |
| `/settings/profile`         | Link chess + social accounts, set username                   |
| `/profile/[username]`       | Public shareable profile                                     |
| `/players`                  | Search players by name/username                              |
| `/organizer/apply`          | Request organizer access                                     |
| `/admin/organizer-requests` | Approve organizers                                           |
| `/organizer`                | Create/manage tournaments                                    |
| `/api/auth/*`               | Better Auth routes (sessions, OAuth callbacks)               |
| `/api/facebook/data-deletion` | Meta data deletion callback                                |
| `/api/chess/lichess/*`      | Lichess chess-account link (start/callback)                  |
| `/api/chess/chesscom/*`     | Chess.com chess-account link (start/callback)                |
| `/api/paymongo/webhook`     | PayMongo webhooks                                            |

## PayMongo (paid tournaments)

Entry fees use PayMongo Hosted Checkout with **GCash**, **QR Ph**, and **PHP** only. ChessHub is the merchant of record.

1. Create a PayMongo account and complete KYC.
2. Copy your secret key (`sk_test_…` or `sk_live_…`) into `PAYMONGO_SECRET_KEY`.
3. In the PayMongo dashboard, enable GCash and QR Ph under payment methods.
4. Add a webhook endpoint pointing to `https://your-domain/api/paymongo/webhook` (full path — not the site root) and subscribe to `checkout_session.payment.paid`.
5. Copy the webhook signing secret into `PAYMONGO_WEBHOOK_SECRET`.

ChessHub also confirms payment when the player returns to the success URL (by retrieving the Checkout Session). That covers local development where PayMongo cannot reach `localhost` webhooks. For production, still configure the webhook.

For local development with GCash / QR Ph:

1. Expose the app with a tunnel, e.g. `ngrok http 5173 --request-header-add "ngrok-skip-browser-warning: true"`.
2. Set `ORIGIN` to that HTTPS tunnel URL (not `http://localhost:5173`).
3. Open ChessHub **through the tunnel URL** so checkout success/cancel redirects return to a host your phone can reach.
4. Register `https://your-tunnel/api/paymongo/webhook` in PayMongo (not just `https://your-tunnel/`) and subscribe to `checkout_session.payment.paid`, `payment.failed`, and `qrph.expired`. Put the signing secret in `PAYMONGO_WEBHOOK_SECRET`.

If `ORIGIN` stays on localhost, PayMongo redirects and webhooks cannot reach your machine after mobile payment — registration stays pending even when GCash succeeds.

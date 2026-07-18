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
- `FACEBOOK_CLIENT_ID` / `FACEBOOK_CLIENT_SECRET` — Meta/Facebook login
- `LICHESS_CLIENT_ID` — Lichess chess-account linking (PKCE; no secret)
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
pnpm db:migrate-social-facebook
```

3. Run the app:

```sh
pnpm dev
```

## Authentication

ChessHub app login uses **Better Auth**:

| Method | Env | Notes |
| --- | --- | --- |
| Email + password | `BETTER_AUTH_SECRET` | Always available |
| Google | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Shown on `/login` and `/register` when both are set |
| Meta (Facebook) | `FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET` | Same UI; also auto-binds a Facebook URL on the user’s social links |

OAuth redirect URIs (must match `ORIGIN`):

- Google: `{ORIGIN}/api/auth/callback/google`
- Meta/Facebook: `{ORIGIN}/api/auth/callback/facebook`

### Google Cloud setup

1. Create an OAuth 2.0 Client ID (Web application) in [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Add the authorized redirect URI above.
3. Copy Client ID and Client Secret into `.env`.

### Meta / Facebook setup

1. Create an app with **Facebook Login** in the [Meta Developer Portal](https://developers.facebook.com/apps).
2. Add the Valid OAuth Redirect URI above (App → Facebook Login → Settings).
3. Copy App ID → `FACEBOOK_CLIENT_ID` and App Secret → `FACEBOOK_CLIENT_SECRET`.

Facebook sign-in upserts `social_link` with `https://www.facebook.com/{accountId}`. Users can still edit or clear that link under `/settings/profile`.

**Not the same as Lichess:** Lichess OAuth only links a chess profile into `chess_account` after the user is already signed into ChessHub. It is not ChessHub app login.

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
| `/login`                    | Email/password + Google/Meta sign-in                         |
| `/register`                 | Email/password + Google/Meta sign-up                         |
| `/settings/profile`         | Link chess + social accounts, set username                   |
| `/profile/[username]`       | Public shareable profile                                     |
| `/players`                  | Search players by name/username                              |
| `/organizer/apply`          | Request organizer access                                     |
| `/admin/organizer-requests` | Approve organizers                                           |
| `/organizer`                | Create/manage tournaments                                    |
| `/api/auth/*`               | Better Auth routes (sessions, OAuth callbacks)               |
| `/api/chess/lichess/*`      | Lichess chess-account link (start/callback)                  |
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

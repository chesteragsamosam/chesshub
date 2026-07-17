# ChessHub

Link chess profiles (Lichess, Chess.com, FIDE), discover local tournaments, and pay entry fees with GCash via PayMongo.

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

- `LICHESS_CLIENT_ID` — Lichess OAuth app client id (PKCE; no secret)
- `PAYMONGO_SECRET_KEY` / `PAYMONGO_WEBHOOK_SECRET` — paid tournament registration (GCash)

2. Start MySQL and sync schema:

```sh
pnpm db:start   # docker compose
pnpm db:push
# If upgrading from Stripe columns locally:
node --env-file=.env scripts/migrate-paymongo.mjs
```

3. Run the app:

```sh
pnpm dev
```

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

| Path                        | Purpose                                    |
| --------------------------- | ------------------------------------------ |
| `/settings/profile`         | Link chess + social accounts, set username |
| `/profile/[username]`       | Public shareable profile                   |
| `/players`                  | Search players by name/username            |
| `/organizer/apply`          | Request organizer access                   |
| `/admin/organizer-requests` | Approve organizers                         |
| `/organizer`                | Create/manage tournaments                  |
| `/api/paymongo/webhook`     | PayMongo webhooks                          |

## PayMongo (paid tournaments)

Entry fees use PayMongo Hosted Checkout with **GCash** and **PHP** only. ChessHub is the merchant of record.

1. Create a PayMongo account and complete KYC.
2. Copy your secret key (`sk_test_…` or `sk_live_…`) into `PAYMONGO_SECRET_KEY`.
3. In the PayMongo dashboard, enable GCash under payment methods.
4. Add a webhook endpoint pointing to `https://your-domain/api/paymongo/webhook` and subscribe to `checkout_session.payment.paid`.
5. Copy the webhook signing secret into `PAYMONGO_WEBHOOK_SECRET`.

For local development, expose your app with a tunnel (e.g. ngrok) and register that URL as the webhook endpoint.

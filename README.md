# ChessHub

Link chess profiles (Lichess, Chess.com, FIDE), discover local tournaments, and pay entry fees via Stripe Connect.

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
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` — paid tournament registration

2. Start MySQL and push schema:

```sh
pnpm db:start   # docker compose
pnpm db:push
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

| Field | Value |
|-------|-------|
| Email | `admin@chesshub.local` |
| Password | `ChessHubAdmin1!` |

Mock players use emails `mock-001@chesshub.local` through `mock-300@chesshub.local` with password `MockPlayer1!`.

## First admin (manual)

Alternatively, after registering a user, promote them in MySQL:

```sql
UPDATE user SET role = 'admin' WHERE email = 'you@example.com';
```

## Main routes

| Path | Purpose |
|------|---------|
| `/settings/profile` | Link chess + social accounts, set username |
| `/profile/[username]` | Public shareable profile |
| `/players` | Search players by name/username |
| `/organizer/apply` | Request organizer access |
| `/admin/organizer-requests` | Approve organizers |
| `/organizer` | Create/manage tournaments |
| `/organizer/stripe` | Stripe Connect onboarding |
| `/api/stripe/webhook` | Stripe webhooks |

## Stripe webhooks (local)

```sh
stripe listen --forward-to localhost:5173/api/stripe/webhook
```

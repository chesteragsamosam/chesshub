# Arena & Swiss tournaments

## ChessHub flow (prize import)

1. Organizer creates a **rated Arena** from ChessHub (or creates Swiss on Lichess and pastes the ID).
2. ChessHub stores `lichessTournamentId` / format; Manage prizes can still adjust the source until finalization.
3. Wait until finished (`isFinished` / `finished` / status finished|completed|30).
4. Fetch NDJSON results and match placements to verified linked Lichess usernames.

Helpers: `src/lib/server/chess/lichess-tournaments.js` (`createLichessArena`, `buildChessHubArenaDescription`, `fetchLichessArenaLive`, standings, matching).

Live public pages use `arena-live-hub.js`: **one shared Lichess poller per Arena** fans out over **SSE** (`GET /api/tournaments/{id}/live`). Featured games optionally stream moves via `GET /api/stream/game/{id}` (3-move delay on Lichess). When the Arena is **finished**, ChessHub auto-sets linked **published** tournaments to `completed` (prizes are still finalized separately by the organizer).

On create, ChessHub pre-generates the tournament id and sets the Lichess Arena **description** to instructions + the public ChessHub join URL (`/tournaments/{id}`).

Arenas are **password-protected** (server-only password + per-player entry codes) and use Lichess **`conditions.allowList`**: seeded with the organizer, then expanded to paid ChessHub registrants who have a linked Lichess account. Sync happens on paid registration and again before **Join Lichess Arena**, so the password alone is not enough to join outside ChessHub.

**Supported for prize import:** standard Arena and Swiss standings only. Not supported: team-battle awards, simuls, studies, manually scored OTB events.

## Arena (`Tournaments (Arena)`)

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/api/tournament` | none | Current / recent schedule |
| POST | `/api/tournament` | `tournament:write` | Create arena (mirrors tournament/new form). Limits: 12 public/day or 24 private/day |
| GET | `/api/tournament/{id}` | none | Detail, duels, standings page |
| POST | `/api/tournament/{id}` | `tournament:write` | Update (avoid important mid-event changes) |
| GET | `/api/tournament/{id}/results` | none | **NDJSON** players by rank — use on **finished** events |
| POST | `/api/tournament/{id}/join` | OAuth | Join |
| POST | `/api/tournament/{id}/withdraw` | OAuth | Withdraw |
| POST | `/api/tournament/{id}/terminate` | OAuth | Terminate |
| GET | `/api/tournament/{id}/games` | none | Games export |
| GET | `/api/tournament/{id}/teams` | none | Team battle teams |
| GET | `/api/user/{username}/tournament/created` | none | Created by user |
| GET | `/api/user/{username}/tournament/played` | none | Played by user |

Create restrictions (API): `clockTime + clockIncrement > 0`; 15s and 0+1 variant cannot be rated; clock vs length must be reasonable.

URL shape: `https://lichess.org/tournament/{id}`

## Swiss (`Tournaments (Swiss)`)

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/api/swiss/new/{teamId}` | OAuth (team) | Create Swiss for a team |
| GET | `/api/swiss/{id}` | none | Detail |
| POST | `/api/swiss/{id}/edit` | OAuth | Edit |
| POST | `/api/swiss/{id}/schedule-next-round` | OAuth | Schedule next round |
| POST | `/api/swiss/{id}/join` | OAuth | Join |
| POST | `/api/swiss/{id}/withdraw` | OAuth | Withdraw |
| POST | `/api/swiss/{id}/terminate` | OAuth | Terminate |
| GET | `/api/swiss/{id}/results` | none | **NDJSON** by rank — use on **finished** events |
| GET | `/api/swiss/{id}/games` | none | Games |
| GET | `/swiss/{id}.trf` | none | TRF export |
| GET | `/api/team/{teamId}/swiss` | none | Team’s Swiss list |

URL shape: `https://lichess.org/swiss/{id}`

## Results streaming

- `Accept: application/x-ndjson`
- Ongoing tournaments can stream **inconsistent** ranks; always prefer **finished** tournaments for prize/final standings.
- Optional `nb` query limits number of players returned.

## ID validation (ChessHub)

Canonical IDs match `/^[A-Za-z0-9]{6,32}$/` after extracting from `/tournament/{id}` or `/swiss/{id}` path segments on `lichess.org` / `www.lichess.org`.

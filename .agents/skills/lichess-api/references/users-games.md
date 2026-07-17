# Users, account, and games

## Users

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/user/{username}` | Public profile (`perfs` ratings, etc.). Optional query: `trophies`, `profile`, `rank`, `fideId` |
| POST | `/api/users` | Up to **300** IDs in body; same order returned. Cap: 8,000 / 10 min, 120,000 / day. **Do not** try to export all users |
| GET | `/api/users/status` | Fast online/playing/streaming flags; `ids` query. Safe to poll ~every 5s |
| GET | `/api/player` | All top 10 leaderboards |
| GET | `/api/player/top/{nb}/{perfType}` | Top players for a perf |
| GET | `/api/player/autocomplete` | Autocomplete |
| GET | `/api/user/{username}/rating-history` | Rating history |
| GET | `/api/user/{username}/perf/{perf}` | Perf stats |
| GET | `/api/user/{username}/activity` | Activity |
| GET | `/api/crosstable/{user1}/{user2}` | Head-to-head |

ChessHub public ratings: `fetchLichessPublicRatings` → `GET /api/user/{username}`.

## Account (authenticated)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/account` | Logged-in profile |
| GET | `/api/account/email` | Needs `email:read` |
| GET | `/api/account/preferences` | Needs preference scopes |
| GET | `/api/account/playing` | Ongoing games |
| GET | `/api/timeline` | Timeline |

## Games (selection)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/game/export/{gameId}` | Single game export |
| GET | `/api/games/user/{username}` | User games (often streamed) |
| POST | `/api/games/export/_ids` | Export by IDs |
| GET | `/api/user/{username}/current-game` | Current game |
| GET | `/api/stream/game/{id}` | Stream one game |
| GET | `/api/stream/games-by-users` | Stream by users |

Full game dumps: use https://database.lichess.org/ rather than hammering the API.

## Related tags in the OpenAPI

Teams, Challenges, Bulk pairings, Board, Bot, Broadcasts, Puzzles, Studies, TV, Analysis, Opening Explorer, Tablebase, FIDE, Messaging, Relations, Simuls, External engine — see path list in `Lichessorg API reference.json`.

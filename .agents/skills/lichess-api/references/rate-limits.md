# Rate limits and NDJSON

## Rate limiting

From the official API introduction:

- All requests are rate limited with various strategies.
- **Only make one request at a time.**
- HTTP **429** means a limit was exceeded.
- In most cases, wait **one minute** before retrying; some limits need longer.
- Reduce request frequency before retrying.

Special limits called out in the OpenAPI:

- `POST /api/users`: 8,000 users / 10 minutes, 120,000 / day
- Arena create: up to 12 public or 24 private tournaments per day
- `GET /api/users/status`: intentionally cheap; polling about once every 5 seconds is fine

Do not use the API as a full-site export. Prefer https://database.lichess.org/ for bulk historical data.

## NDJSON streaming

Some endpoints stream **Newline Delimited JSON** (one JSON object per line).

ChessHub parser:

```js
text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => JSON.parse(l));
```

Set `Accept: application/x-ndjson` on results endpoints.

Useful reader gist (upstream docs): https://gist.github.com/ornicar/a097406810939cf7be1df8ea30e94f3e

## Retries

1. Catch non-OK responses; treat 429 separately with backoff ≥ 60s.
2. Do not parallelize bursts of Lichess fetches from the same process.
3. Prefer caching public tournament detail/results after an event is finished.

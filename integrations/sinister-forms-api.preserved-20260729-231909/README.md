# sinister-forms-api

Isolated, single-purpose HTTP bridge that receives form submissions from the
Sinister Diesel V2 storefront and creates items in a monday.com board.

Runs as its own process on **`127.0.0.1:3100`** behind Nginx (TLS terminated at
Nginx). It is deliberately **separate** from the NetSuite↔monday sync service —
they share nothing, so a fault in one cannot take down the other.

## Architecture

```
Browser (storefront form)
   │  POST https://www.sinisterdiesel.com/api/forms/submit
   ▼
Nginx (443, Let's Encrypt)  ──proxy_pass──►  127.0.0.1:3100
                                                   │
                                                   ▼
                                          monday.com GraphQL API
```

## Files

| File | Purpose |
|------|---------|
| `server.js` | Express app, routes, error handling, graceful shutdown |
| `lib/config.js` | Env loader, fails fast on missing required vars |
| `lib/middleware.js` | Strict CORS allow-list + in-memory rate limiting |
| `lib/validate.js` | Input normalisation, validation, honeypot |
| `lib/monday.js` | monday.com GraphQL client (`create_item`) |
| `.env.example` | Template — copy to `.env` on the server, fill in |

## Endpoints

- `GET /healthz` → `{ ok: true }` — liveness probe.
- `POST /api/forms/submit` — accepts JSON:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "555-0100",
    "subject": "Warranty question",
    "message": "…",
    "source": "warranty",
    "company_website": ""   // honeypot — must stay empty
  }
  ```
  Responses: `200 {ok:true,id}`, `422 validation_failed`, `429 rate_limited`,
  `502 downstream_unavailable`.

## Board column mapping

`lib/monday.js` → `COLUMN_MAP` maps submission fields to monday column **ids**.
The defaults (`email`, `phone`, `text`, `text0`, `long_text`, `text1`) are
placeholders. **Confirm the real column ids** before go-live:

```bash
curl -s https://api.monday.com/v2 \
  -H "Authorization: $MONDAY_ACCESS_TOKEN" \
  -H "API-Version: 2024-10" \
  -H "Content-Type: application/json" \
  -d '{"query":"query{boards(ids:[YOUR_BOARD_ID]){columns{id title type}}}"}'
```

Update `COLUMN_MAP` to match, then restart the service.

## Deploy (server)

```bash
# 1. Copy the folder to the server, e.g. /opt/sinister-forms-api
cd /opt/sinister-forms-api
npm ci --omit=dev            # installs express only

# 2. Configure
cp .env.example .env
nano .env                    # fill MONDAY_*, ALLOWED_ORIGINS, etc.
chmod 600 .env

# 3. Run under PM2 (matches the sync service pattern)
pm2 start server.js --name sinister-forms-api --time
pm2 save

# 4. Verify
curl -s http://127.0.0.1:3100/healthz
```

## Nginx (already prepared in Phase 1)

The `location /api/forms/` block should `proxy_pass http://127.0.0.1:3100;`
with `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;` so the
service's rate limiter sees real client IPs (`trust proxy = loopback`).

## Security notes

- Binds to `127.0.0.1` only — never directly reachable from the internet.
- CORS is a strict allow-list (`ALLOWED_ORIGINS`); unknown origins get 403.
- JSON body capped at 32 kb; per-IP rate limit (default 20/min).
- Honeypot field silently drops bot submissions (returns 200, writes nothing).
- `.env` holds the monday token — keep it `chmod 600`, never commit it.

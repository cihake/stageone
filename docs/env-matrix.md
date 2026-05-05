# Environment Variable Matrix

Authoritative source for every env var StageOne uses. The release plan
(§4.1) requires that every variable appearing in any environment appears in
all three — missing keys must fail loudly at boot, not silently at request
time. The Zod schema in `packages/server/src/config/env.ts` enforces this
contract on the server side.

> **Rule:** never commit a real `.env`. Commit only `.env.example` files.

## Server (`packages/server/.env`)

| Variable                 | Dev                          | Staging                            | Production                          |
| ------------------------ | ---------------------------- | ---------------------------------- | ----------------------------------- |
| `NODE_ENV`               | `development`                | `staging`                          | `production`                        |
| `PORT`                   | `4000`                       | (set by Render)                    | (set by Render)                     |
| `CORS_ORIGIN`            | `http://localhost:5173`      | `https://staging.stageone.app`     | `https://www.stageone.app`          |
| `MONGODB_URI`            | Atlas dev cluster URI        | Atlas staging cluster URI          | Atlas prod cluster URI              |
| `JWT_SECRET`             | dev-only random 32 bytes     | staging-only random 32 bytes       | prod-only random 32 bytes           |
| `JWT_EXPIRES_IN`         | `15m`                        | `15m`                              | `15m`                               |
| `JWT_REFRESH_EXPIRES_IN` | `7d`                         | `7d`                               | `7d`                                |
| `CLOUDINARY_URL`         | dev folder credentials       | staging folder credentials         | prod folder credentials             |
| `OPENAI_API_KEY`         | personal dev key             | shared-staging key (rate-limited)  | shared-prod key (rate-limited)      |
| `OLLAMA_HOST`            | `http://localhost:11434`     | staging sidecar URL                | prod sidecar URL                    |
| `RESEND_API_KEY`         | test-mode key                | live key (staging.stageone.app)    | live key (stageone.app)             |
| `SENTRY_DSN`             | (blank)                      | staging DSN                        | prod DSN                            |

## Client (`packages/client/.env` or `.env.local`)

Vite only exposes vars prefixed with `VITE_` to browser code.

| Variable           | Dev   | Staging                              | Production                       |
| ------------------ | ----- | ------------------------------------ | -------------------------------- |
| `VITE_API_URL`     | empty (Vite proxy) | `https://staging-api.stageone.app` | `https://api.stageone.app` |
| `VITE_SENTRY_DSN`  | empty | staging browser DSN                  | prod browser DSN                 |
| `VITE_SITE_URL`    | `http://localhost:5173` | `https://staging.stageone.app` | `https://www.stageone.app` |

## Where each value lives

| Environment | Server values            | Client values            |
| ----------- | ------------------------ | ------------------------ |
| Dev         | `packages/server/.env`   | `packages/client/.env`   |
| Staging     | Render dashboard → env   | Vercel project → env     |
| Production  | Render dashboard → env   | Vercel project → env     |

## Generating secrets

```bash
# Generate a JWT_SECRET (32 random bytes, hex-encoded)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Rotation policy (release plan §6.2)

- All secrets rotated at production launch.
- Then rotated every 90 days thereafter.
- Rotation procedure: generate new value → update Render/Vercel → redeploy →
  invalidate the old value. Document each rotation in `docs/runbooks/`.

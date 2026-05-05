# @stageone/server

The StageOne API. Express 4 + Mongoose 8 + JWT, written in TypeScript and
executed directly with `tsx` (no separate compile step in dev or prod).

## Layout

```
src/
├── server.ts              entry point — boots DB + binds the port
├── app.ts                 Express app factory (middleware + routes)
├── config/
│   ├── env.ts             Zod-validated environment access
│   └── db.ts              Mongoose connect with retry + status helper
├── middleware/
│   ├── error.ts           HttpError class + central error handler
│   └── notFound.ts        404 JSON responder
├── routes/
│   ├── index.ts           /api mount point
│   └── health.routes.ts   liveness + readiness
├── models/                six Mongoose models (see docs/erd.md)
│   ├── index.ts           barrel export
│   ├── User.ts            identity + auth
│   ├── Artist.ts          1:1 with User; public profile
│   ├── Track.ts           audio releases owned by an Artist
│   ├── Gig.ts             upcoming + past live shows
│   ├── Follow.ts          fan → artist subscription junction
│   └── Message.ts         direct messaging (threaded)
└── scripts/
    └── seed.ts            populate dev DB with demo content
```

## Scripts

| Command             | What it does                                      |
| ------------------- | ------------------------------------------------- |
| `npm run dev`       | tsx watch — restart on file save                  |
| `npm run start`     | tsx — for production (Render runs this)           |
| `npm run seed`      | wipe + repopulate the database with demo content  |
| `npm run build`     | `tsc --noEmit` — type-check only (no bundle)      |
| `npm run typecheck` | Same as build                                     |

## Endpoints (v0.2)

| Method | Path                  | Auth         | Purpose                            |
| ------ | --------------------- | ------------ | ---------------------------------- |
| GET    | `/api/health`         | none         | Liveness — process up              |
| GET    | `/api/health/ready`   | none         | Readiness — DB connected too       |
| POST   | `/api/auth/register`  | none         | Create account (fan or artist)     |
| POST   | `/api/auth/login`     | none         | Exchange credentials for a session |
| POST   | `/api/auth/refresh`   | refresh cookie | Rotate refresh; issue new access |
| POST   | `/api/auth/logout`    | refresh cookie | Revoke refresh; clear cookies    |
| GET    | `/api/auth/me`        | access token | Current user                       |

### Auth flow

```
Client                          Server
  │                               │
  │  POST /register or /login     │
  │  { email, password, ... }     │
  │ ────────────────────────────► │
  │                               │  bcrypt verify ↔ User
  │                               │  signAccessJwt(15m)
  │                               │  generateRefreshToken
  │                               │  store sha256 in RefreshToken
  │  Set-Cookie: so_at, so_rt     │
  │ ◄──────────────────────────── │  { user }
  │                               │
  │  GET /any-protected           │
  │  Cookie: so_at=...            │
  │ ────────────────────────────► │
  │                               │  verifyAccessJwt → req.user
  │ ◄──────────────────────────── │
  │                               │
  │  …15 minutes later, 401 from   │
  │  expired access token…        │
  │  POST /refresh                │
  │  Cookie: so_rt=...            │
  │ ────────────────────────────► │
  │                               │  hash & look up; rotate;
  │                               │  revoke old, issue new pair.
  │  Set-Cookie: so_at, so_rt     │
  │ ◄──────────────────────────── │  { user }
```

## Env vars

See `.env.example` and the project-root `docs/env-matrix.md`.

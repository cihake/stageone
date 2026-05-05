# StageOne

> Indie-musician discovery platform.
> WEB 268 capstone, Harrisburg Area Community College, Spring 2026.

StageOne is a single, cleanly designed place where a listener can find local
indie artists, hear their tracks, follow them, and know when and where they're
playing next — with an AI assistant that can answer "what's a good show this
Friday?" in plain English.

The full project background lives in the planning documents in the project
root: **`StageOne_needs_assessment_questionnaire.pdf`**,
**`StageOne_website_specification.pdf`**, and **`StageOne_release_plan.pdf`**.
Read them in that order if you're new to the project.

## Stack

| Layer    | Tech                                            |
| :------- | :---------------------------------------------- |
| Database | MongoDB Atlas (M0 free in dev)                  |
| API      | Node.js + Express 4 + Mongoose 8 + TypeScript   |
| Frontend | React 18 + Vite 5 + TypeScript + react-router 6 |
| Auth     | Custom JWT + bcrypt                             |
| Media    | Cloudinary (Phase 2)                            |
| AI       | OpenAI + Ollama/Llama-3 fallback (Phase 4)      |
| Hosting  | Render (API) + Vercel (client) + Atlas (DB)     |
| Email    | Resend (Phase 5)                                |

## Repo layout

```
.
├── packages/
│   ├── server/          @stageone/server  — Express + Mongoose API
│   └── client/          @stageone/client  — React + Vite web app
├── docs/
│   ├── env-matrix.md    All env vars across dev / staging / prod
│   └── setup/
│       └── atlas.md     MongoDB Atlas walkthrough
├── .husky/              git hooks: pre-commit (lint-staged) + commit-msg (commitlint)
├── .vscode/             recommended extensions + settings.json.example
├── eslint.config.js     flat-config ESLint, TS rules
├── .prettierrc.json     Prettier config
├── commitlint.config.js Conventional-Commits rules
├── tsconfig.base.json   shared TS strictness for both workspaces
└── package.json         npm workspaces root
```

## Prerequisites

- **Node 22+** and **npm 10+** (`nvm install 22 && nvm use 22` or use the
  `.nvmrc`).
- A **MongoDB Atlas** account (free) — see `docs/setup/atlas.md`.
- **Git**.
- A code editor (VS Code is recommended; the project ships
  `.vscode/extensions.json`).

## Quickstart

```bash
# 1. From C:\Users\evaqc\Desktop\current\WEB268\WEB-268-Final-Project,
#    re-init git so it's clean (one-time):
git init -b main
git add .
git status   # confirm node_modules and .env are NOT listed

# 2. Install all workspace deps (one command for both packages):
npm install

# 3. Copy the .env templates and fill in real values:
cp packages/server/.env.example packages/server/.env
cp packages/client/.env.example packages/client/.env
#   - Set MONGODB_URI from the Atlas walkthrough in docs/setup/atlas.md
#   - Generate JWT_SECRET:
#       node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 4. Run both dev servers in parallel:
npm run dev
#   API:    http://localhost:4000/api/health
#   Client: http://localhost:5173
```

When the client comes up, click **Smoke test (v0.1)** on the home page (or
visit <http://localhost:5173/health>). Both panels should report `status: ok`
and the readiness panel should report `db.state: connected`. If they do, the
v0.1 Skeleton release from the release plan is complete.

## Workspace scripts (run from repo root)

| Command            | What it does                                            |
| ------------------ | ------------------------------------------------------- |
| `npm run dev`      | Run server and client dev servers in parallel           |
| `npm run build`    | Type-check the server, build the client                 |
| `npm run typecheck`| Type-check both packages                                |
| `npm run lint`     | ESLint across both packages                             |
| `npm run lint:fix` | Auto-fix lint issues                                    |
| `npm run format`   | Prettier write across the repo                          |

## Per-package scripts

```bash
npm --workspace @stageone/server run dev      # API only
npm --workspace @stageone/client run dev      # Client only
npm --workspace @stageone/server run typecheck
npm --workspace @stageone/client run build
```

## Conventional commits

Commits must follow [Conventional Commits](https://www.conventionalcommits.org/).
The commit-msg hook enforces this. Allowed scopes: `repo`, `server`, `client`,
`docs`, `ci`, `deps`, `release`.

```
feat(server): add /api/auth/register
fix(client): correct focus-ring color on dark header
chore(deps): bump mongoose to 8.7.4
docs(repo): document Atlas setup
```

## Where to go next

1. **`docs/setup/atlas.md`** — provision the dev cluster.
2. **`packages/server/.env.example`** — copy to `.env` and fill in.
3. **`packages/client/.env.example`** — copy to `.env` and fill in.
4. **Run `npm run dev`** and confirm `/health` is green.
5. Open `StageOne_release_plan.pdf` and start ticking through Phase 2
   (Foundation Build) work packages WP3 (Auth & RBAC) and WP4 (API endpoints).

## License

MIT — see `LICENSE.txt`.

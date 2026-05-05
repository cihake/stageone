# MongoDB Atlas — Free-Tier Setup

End-to-end walkthrough for provisioning the dev cluster StageOne uses for
v0.1. You'll repeat this twice more later (staging cluster, production
cluster) before the v0.2 deploy.

> **Time:** ~10 minutes. **Cost:** $0 — M0 free tier.

## 1. Create an Atlas account

1. Go to <https://www.mongodb.com/cloud/atlas/register>.
2. Sign up with your hawkmail address (or any email — academic email is not
   required for the free tier).
3. Skip the "What kind of database?" survey or pick anything; it doesn't
   affect what you'll build.

## 2. Create the dev cluster

1. **Project name:** `StageOne` (you can leave the default and rename later).
2. Click **+ Create** under Database.
3. Choose **M0 (Free)**. Confirm "Shared" tier with 512 MB storage.
4. **Provider:** AWS. **Region:** pick the one closest to you (e.g.,
   `us-east-1 / N. Virginia`). Region matters for latency, not cost.
5. **Cluster name:** `stageone-dev`. Click **Create Deployment**.
6. Atlas will spend 1–3 minutes provisioning. Move to step 3 while it works.

## 3. Create a database user

Atlas will prompt you with a "Connect to your cluster" wizard. If it doesn't,
go to **Security → Database Access → + Add New Database User**.

1. **Authentication method:** Password.
2. **Username:** `stageone-app`.
3. **Password:** click **Autogenerate Secure Password** and **copy it
   immediately** — you cannot view it again later. Paste it in your password
   manager.
4. **Database User Privileges:** "Read and write to any database" is fine for
   v0.1; we'll narrow it later.
5. Click **Add User**.

## 4. Allow your IP to connect

**Security → Network Access → + Add IP Address.**

For development, you have two options:

| Option | When to use | How |
| --- | --- | --- |
| **Add Current IP Address** | You always work from one place | Atlas detects your IP; click confirm. |
| **Allow Access From Anywhere** (`0.0.0.0/0`) | You move between coffee shops / will deploy to Render | Atlas warns this is permissive — that's fine for dev because the cluster is also protected by the database user's password. **Do not** use this on the production cluster. |

For staging and production clusters, narrow it to Render's outbound IP ranges
(documented at <https://render.com/docs/static-outbound-ip-addresses>).

## 5. Get the connection string

1. Click your `stageone-dev` cluster → **Connect** → **Drivers**.
2. **Driver:** Node.js. **Version:** 5.5 or later.
3. Atlas shows a string like:

   ```
   mongodb+srv://stageone-app:<password>@stageone-dev.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

4. Replace `<password>` with the password you copied in step 3.
5. Add the database name `stageone-dev` between the host and the `?`:

   ```
   mongodb+srv://stageone-app:HjK...@stageone-dev.xxxxx.mongodb.net/stageone-dev?retryWrites=true&w=majority
   ```

6. Paste the full string into `packages/server/.env` as `MONGODB_URI=...`.

## 6. Verify the connection

From the repo root:

```bash
npm install                              # one-time, installs both workspaces
npm --workspace @stageone/server run dev
```

You should see:

```
[db] Connected to MongoDB (host=ac-xxxxx.mongodb.net, db=stageone-dev)
[server] StageOne API listening on http://localhost:4000 (development)
```

If you see `MongoServerSelectionError`, double-check (a) the password in the
URI, and (b) that Network Access lists your IP (or `0.0.0.0/0`).

## 7. (Optional) Browse the data with Compass

[MongoDB Compass](https://www.mongodb.com/products/compass) is the official
GUI. Paste the same connection string into Compass to inspect collections,
documents, and indexes — useful when validating the User model in v0.1.

## 8. Plan ahead

You'll repeat steps 2–5 twice more during the project:

| When         | Cluster name        | Used by                         |
| ------------ | ------------------- | ------------------------------- |
| Now (v0.1)   | `stageone-dev`      | Local dev + PR previews         |
| v0.2 deploy  | `stageone-staging`  | The staging.stageone.app build  |
| v1.0 cutover | `stageone-prod`     | Production cutover (May 1)      |

Each cluster is fully isolated — different connection strings, different
users, no shared data — per release plan §4.

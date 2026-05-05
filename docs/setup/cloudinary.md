# Cloudinary — Free-Tier Setup

End-to-end walkthrough for provisioning the media account StageOne uses for
artist avatars, cover images, and (in later sessions) audio + video uploads.

> **Time:** ~5 minutes. **Cost:** $0 — free tier (25 monthly credits).

## 1. Create the account

1. Go to <https://cloudinary.com/users/register_free>.
2. Sign up with your hawkmail address (or any email).
3. Skip the "How will you use Cloudinary?" survey or pick anything.
4. Confirm via email.

## 2. Get your `CLOUDINARY_URL`

1. After login you land on the **Programmable Media → Dashboard** page.
2. In the top card you'll see your **Cloud Name**, **API Key**, and **API
   Secret**.
3. Click the **API Environment variable** field. Cloudinary already shows the
   pre-formatted string:

   ```
   CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME
   ```

4. Click the eye icon to reveal it, then copy the whole line.

## 3. Wire it into `.env`

Open `packages/server/.env` and replace the placeholder with the line you
just copied:

```bash
CLOUDINARY_URL=cloudinary://123456789012345:abc-DEF_ghi-JKL_mno-PQR_stu@yourcloud
```

> **Don't commit this.** `packages/server/.env` is gitignored. The `.env.example`
> in the repo has the placeholder that's safe to commit.

## 4. Verify

Restart the server (`npm run dev` from the repo root). On boot you shouldn't
see the warning:

```
[cloudinary] CLOUDINARY_URL is not set — image uploads will fail.
```

If it's quiet, you're good.

## 5. Test an upload

The fastest end-to-end test: sign in as an artist, go to **/account/artist**,
create a profile if needed, and use the **Avatar** uploader. After it
succeeds, browse to your Cloudinary **Media Library** — you should see a new
folder `stageone-development/artists/avatar/` containing the file.

## 6. Plan ahead

You'll create separate folders per environment automatically — the server
prefixes with `stageone-${NODE_ENV}` (so `stageone-development`,
`stageone-staging`, `stageone-production`). Each environment gets its own
`CLOUDINARY_URL` per release-plan §4.1; the dev one is fine to share between
your local and PR-preview deployments.

## Free-tier limits to know

- **25 monthly credits.** Each credit ≈ 1,000 image transforms or 1 GB
  bandwidth or 1 GB storage. For capstone-scale traffic you'll be well under.
- **Max 25 GB managed storage.** A few hundred avatars and covers won't dent
  this.
- **No bandwidth caching outside Cloudinary's CDN.** That's fine — CDN
  delivery is what we want.

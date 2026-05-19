# TrainingSurvey

Arabic-language training-feedback survey for the DocsysFrontend training program. Static HTML/CSS/JS frontend + Netlify Functions backend + Netlify Blobs storage. Wilayah-themed (green/gold), Saudi-tuned MSA copy.

## Local development

Requires Node 20+.

```bash
npm install
npm test            # runs all unit tests (auth, stats, csv)
```

To run the full stack locally (functions + Blobs emulation), install Netlify CLI:

```bash
npm install -g netlify-cli
netlify login
netlify link        # link to your Netlify site (one-time)
netlify dev         # serves on http://localhost:8888
```

Set these env vars locally (Netlify CLI loads from `.env`):

```
ADMIN_USERNAME=Admin
ADMIN_PASSWORD=P@s$w0rd
ADMIN_SESSION_SECRET=<generated with: openssl rand -hex 32>
```

## Deployment

1. Push this folder to a new GitHub repository.
2. On netlify.com → "Add new site" → "Import from Git" → pick the repo.
3. Set environment variables in **Site settings → Environment variables**:
   - `ADMIN_USERNAME` — e.g. `Admin`
   - `ADMIN_PASSWORD` — e.g. `P@s$w0rd`
   - `ADMIN_SESSION_SECRET` — random 32-byte hex string (run `openssl rand -hex 32`)
4. Netlify auto-detects `netlify.toml` and deploys. First build ~30s.
5. Optionally configure a custom domain in **Domain settings**.
6. Share the survey URL with trainees. Admin lives at `<your-site>/admin`.

## Editing questions

Open `public/questions.json`. Add/remove/edit question entries. **Keep stable IDs** if you only edit wording — old responses stay linked. Removing a question: just delete the entry; old data still in blobs (queryable via the `responses` bucket export). Adding a question: new responses get the new field; old ones don't have it (admin dashboard handles missing fields gracefully).

Commit + push = Netlify redeploys automatically.

## Architecture

See `docs/DESIGN.md`.

## Tests

```bash
npm test
```

- `tests/auth.test.js`     — HMAC sign/verify, email hashing
- `tests/stats.test.js`    — aggregation, NPS, word cloud, filtering
- `tests/csv.test.js`      — CSV serialization, Excel compatibility

## Project layout

```
public/         — static files (served at site root)
netlify/        — serverless functions
tests/          — unit tests (node:test)
docs/           — DESIGN.md (spec) + IMPLEMENTATION_PLAN.md
```

## Acceptance checklist

See `docs/DESIGN.md` Section 9. Run through before sharing the link.

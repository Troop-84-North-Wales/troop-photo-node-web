# Troop 84 North Wales — website v2 (with live Facebook photo carousel)

Same static site as before (Home, About, History, Calendar, Photos — navy/gold theme),
plus an auto-rotating photo carousel on the **Home** page and at the top of **Photos**.
Photos are pulled live from the Facebook Page *"Backup Page for Scouting Photos"*
(Page ID `1312640681940485`) through the Facebook Graph API.

A tiny Node.js server (`server.js`, **zero npm dependencies**) serves the site and
calls Facebook on the server side, so the access token never reaches visitors' browsers.
Photos stay hosted on Facebook's CDN — nothing is downloaded or stored.

```
server.js          Node server: static files + /api/photos + /healthz
package.json       "npm start" -> node server.js (Node 18+)
.env               YOUR SECRETS (FB_PAGE_TOKEN, FB_PAGE_ID) — never commit/share
.env.example       template for .env
render.yaml        optional Render blueprint
public/            the website (HTML, css/, js/, logo/)
  js/config.js     site settings incl. carousel options
  js/carousel.js   carousel behaviour
```

## Run locally (Windows, macOS, Linux)

1. Install **Node.js 18 or newer** from <https://nodejs.org> (LTS). Check with `node -v`.
2. Make sure a `.env` file exists in this folder (copy `.env.example` to `.env` and paste the token):
   ```
   FB_PAGE_ID=1312640681940485
   FB_PAGE_TOKEN=your-page-access-token
   ```
3. In a terminal in this folder run:
   ```
   npm start
   ```
   (or `node server.js` — there is nothing to `npm install`).
4. Open <http://localhost:3000>.

To use another port: `set PORT=8080 && npm start` (Windows cmd), `$env:PORT=8080; npm start` (PowerShell), `PORT=8080 npm start` (macOS/Linux).

## Endpoints

| URL | What |
| --- | --- |
| `/` and `/*.html` | the website |
| `/api/photos` | JSON array, newest first: `{id, src, width, height, caption, link, created_time}`. Cached in memory for 15 minutes (Facebook image URLs expire, so it refreshes). On failure: HTTP 502 with `{error, facebookUrl}` and the carousel shows a "see our photos on Facebook" link instead. |
| `/healthz` | returns `ok` (for Railway/Render health checks) |

## Carousel settings (`public/js/config.js`)

`carouselIntervalMs` (default 5000), `carouselShowCaptions`, `carouselShowDates`,
`carouselMaxPhotos` (0 = all), `carouselShuffle`, `facebookPageUrl`.

Features: auto-advance, prev/next buttons, counter, pause/play button, pauses on hover/focus
and when the tab is hidden, keyboard ← / →, touch swipe, no auto-advance when the visitor has
"reduce motion" turned on, lazy loading with neighbour preloading, each slide links to the photo
on Facebook.

Optional server env vars: `PHOTO_CACHE_MINUTES` (default 15), `FB_GRAPH_VERSION` (default `v21.0`).

## ⚠️ The token is a secret

`FB_PAGE_TOKEN` is a never-expiring Page access token. Anyone who has it can act as the Page.

- Keep it only in `.env` (local) or in the host's environment-variable settings.
- `.env` is listed in `.gitignore` — never commit it, never put it in `public/`, never paste it in chat or tickets.
- If it leaks, revoke it in Facebook (Meta for Developers → your app, or change the Page admin's password / remove the app's access) and generate a new one.

## Deploy on Railway

1. Push this folder to a GitHub repo (`.env` is ignored automatically — good).
2. Railway → **New Project → Deploy from GitHub repo** → pick the repo. Railway detects Node and runs `npm start`.
3. Open the service → **Variables** → add
   - `FB_PAGE_TOKEN` = *your token*
   - `FB_PAGE_ID` = `1312640681940485`
   (Don't set `PORT`; Railway provides it.)
4. **Settings → Networking → Generate Domain**. Optionally set the health check path to `/healthz`.

## Deploy on Render

Option A — Blueprint: Render → **New → Blueprint** → pick the repo; it reads `render.yaml`
and will prompt you for `FB_PAGE_TOKEN` (marked `sync: false`, so it is never stored in the repo).

Option B — manual: **New → Web Service** → pick the repo →
Runtime *Node*, Build command `echo no build`, Start command `npm start`, Health check path `/healthz`.
Then **Environment** → add `FB_PAGE_TOKEN` (secret) and `FB_PAGE_ID=1312640681940485`.

Note: Render's free plan sleeps after inactivity, so the first visit can take ~30–60 s to wake.

## Editing content

Page text is plain HTML in `public/`. Calendar and gallery links are in `public/js/config.js`.
To add photos to the carousel, just upload them to the Facebook Page — they appear within 15 minutes
(or restart the server).

## Fundraising posters only
The carousel shows **only** the photos in one album on the backup Facebook Page, named `Fundraisers` by default (change it with `FB_ALBUM_NAME`, or pin it with `FB_ALBUM_ID`). Photos elsewhere on the Page are never shown. If the album doesn't exist or is empty, the poster section stays hidden. New posters show up within about 15 minutes of being added to the album.

## GitHub Pages (static hosting)
`.github/workflows/pages.yml` builds and deploys the site to GitHub Pages on every push to `main`, every 6 hours (Facebook image links expire), and on demand from the Actions tab. The build (`npm run build:pages`) copies `public/` and writes `api/photos.json` with only the Fundraisers album; the token is read from the repo secret `FB_PAGE_TOKEN` and never ends up in the site.

One-time setup: **Settings → Pages → Source: GitHub Actions**, and **Settings → Secrets and variables → Actions → New repository secret** `FB_PAGE_TOKEN`. Without the secret the site still deploys, just without posters.

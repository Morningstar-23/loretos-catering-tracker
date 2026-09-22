# Loreto's Catering Tracker

An offline PWA for tracking catering gear: what leaves the kitchen, what comes
back, and what in the van isn't ours. Built to run on an iPhone 5s (iOS 12
Safari, 320 px) with no network, no build step and no framework.

Total payload: **94 KB of HTML, CSS and JS — about 24 KB gzipped**, no runtime
dependencies, and zero network requests once the service worker has cached it.

---

## Why this stack instead of Tailwind + Vite + Preact

You said the stack was a suggestion, so here's what changed and why:

| Suggested | Shipped | Reason |
|---|---|---|
| Tailwind CSS | One hand-written `app.css` (~11 KB) | Tailwind needs a build to stay small, and its defaults use `gap` in flexbox, which **iOS 12 does not support** in flex containers. Hand-written CSS lets every rule be checked against Safari 12. |
| Vite + `@vitejs/plugin-legacy` | No build at all | The legacy plugin ships two bundles plus a polyfill chunk — more bytes and more parse time on an A7 chip. Plain ES5-safe scripts load and run immediately. |
| Preact | Vanilla JS, string templates | Nothing here needs a virtual DOM. Hot paths (the +/− counters) patch two text nodes directly instead of re-rendering. |
| `idb-keyval` | 40-line IndexedDB wrapper in `js/db.js` | One less dependency to cache and version. |

Everything else is as you specified: localStorage for data, IndexedDB for
photos, JSON export/import, service worker, web app manifest, 44 px touch
targets, inline SVG + emoji, your exact palette.

**Deliberate iOS 12 avoidances:** optional chaining, nullish coalescing,
`Object.fromEntries`, `structuredClone`, ES modules, flexbox `gap`,
`aspect-ratio`, `:is()`, `100dvh`, WebP, Blob-valued IndexedDB records.

---

## Project tree

```
loretos-catering-tracker/
├── index.html                  App shell: meta tags, tab bar, sheet host
├── manifest.webmanifest        Name, icons, standalone display
├── sw.js                       Cache-first service worker (bump CACHE to ship)
├── README.md
├── css/
│   └── app.css                 Tokens, components, motion — the whole design system
├── js/
│   ├── db.js                   IndexedDB key/value store for photos
│   ├── image.js                Photo compressor (EXIF rotate → resize → JPEG)
│   ├── store.js                All data: items, categories, presets, events, KPIs
│   ├── ui.js                   Toast, bottom sheet, confirm, tag chips, steppers
│   ├── app.js                  Hash router + one delegated tap handler
│   └── views/
│       ├── dashboard.js        KPIs, active-event banner, quick moves
│       ├── inventory.js        Gear CRUD, search, category manager, photos
│       ├── catering.js         Load-out, pack-down counting, Not Ours, close-out
│       ├── history.js          Finished events, recovery rates, detail sheet
│       └── settings.js         Backup, restore, storage tools
├── icons/
│   ├── icon-180.png            apple-touch-icon
│   ├── icon-192.png
│   ├── icon-512.png
│   └── icon-512-maskable.png
└── tools/
    └── compress-images.mjs     Optional desktop bulk photo compressor (sharp)
```

---

## Run it

Service workers need `http://`, not `file://`:

```bash
cd loretos-catering-tracker
python3 -m http.server 8080      # or: npx serve .
```

Open `http://localhost:8080`. To test on the phone, use your laptop's LAN IP
(`http://192.168.x.x:8080`) with both devices on the same wifi.

## Put it on your dad's phone

1. Host the folder anywhere with HTTPS — GitHub Pages, Netlify drop,
   Cloudflare Pages. It is static files only, so drag-and-drop works.
   (iOS only registers a service worker over HTTPS or on `localhost`.)
2. Open the URL in **Safari** on the 5s.
3. Share button → **Add to Home Screen**.
4. Open it from the home screen once while online so the shell caches.
   After that it runs in airplane mode.

Chrome and Firefox on iOS can't install web apps. It has to be Safari.

---

## How it's used on a job

1. **Event tab → preset** ("Standard 100 pax buffet"). Name it, set the venue.
2. Adjust the counts as the van loads, then **Van is loaded — lock it in**.
   Counts freeze at that point.
3. At pack-down: **Pack down** tab, one row per kind of gear, big +/− and an
   **All back** button. The row turns green when it's complete, terracotta
   while it's short. The bar at the top shows the whole van at a glance.
4. **Not ours** tab: flag anything foreign before driving off.
5. **Finish this event** → summary with the missing list, an optional
   "write it off the shelf" checkbox, and an offer to save the load-out
   as a preset. It lands in History with a recovery percentage.

Only one event runs at a time — that's deliberate, it keeps the pack-down
screen unambiguous at 11pm.

---

## Photos

`js/image.js` handles the compression in-browser:

- reads EXIF orientation (iOS 12 does **not** auto-rotate canvas draws)
- draws to a canvas at 900 px longest edge, plus a 128 px thumbnail
- steps JPEG quality down from 0.72 until the full image is under ~70 KB
- stores both as data URLs in IndexedDB, keyed `ph-xxxx` and `ph-xxxx-t`

A 4 MB iPhone photo lands at roughly 55–70 KB. Lists only ever load the
thumbnails, and they load after paint so scrolling never blocks.

`tools/compress-images.mjs` is the optional desktop version for seeding a
whole folder at once (`npm install sharp`, then run it).

## Backups

Setup → Export produces one JSON file containing the data *and* the photos.
iOS 12 Safari ignores `<a download>`, so the export sheet also shows the raw
text with a select-all button — paste it into Notes, Mail or Files. Restore
accepts either a file or pasted text.

---

## Scaling

localStorage holds ~5 MB per origin. A closed event stores about 60 bytes per
line, so a 20-line event is ~1.5 KB: roughly **2,000 events** before it gets
tight, and Setup shows the current size in KB. Photos live in IndexedDB
(hundreds of MB available), so they never compete with the event history.

If it ever does fill up, the honest fix is to export a backup and delete the
oldest years from History.

## Changing the brand

Every colour is a custom property at the top of `css/app.css`. The tape and
stamp chip styles are `.tag` and `.tag-stamp` — that's the one loud element
in the design, everything else stays quiet on purpose.

```
loretos-catering-tracker
├─ css
│  └─ app.css
├─ icons
│  ├─ icon-180.png
│  ├─ icon-192.png
│  ├─ icon-512-maskable.png
│  └─ icon-512.png
├─ index.html
├─ js
│  ├─ app.js
│  ├─ db.js
│  ├─ image.js
│  ├─ store.js
│  ├─ ui.js
│  └─ views
│     ├─ catering.js
│     ├─ dashboard.js
│     ├─ history.js
│     ├─ inventory.js
│     └─ settings.js
├─ manifest.webmanifest
├─ README.md
├─ sw.js
└─ tools
   └─ compress-images.mjs

```
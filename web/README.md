# UULE web page

Static Vue 3 + Vite site, published to GitHub Pages at
https://smatei.github.io/google-adwords-preview-location/

## Local development

```bash
cd web
npm install
npm run data   # generate public/data/*.json from the newest ../geotargets-*-with-uule.csv
npm run dev    # http://localhost:5173/google-adwords-preview-location/
npm run build  # production build into dist/
npm run preview
```

## Structure

```
web/
  index.html            entry HTML
  vite.config.js        base path for GitHub Pages
  scripts/build-data.mjs  CSV -> per-country JSON (run in CI before build)
  public/data/          generated, not committed
  src/main.js
  src/App.vue
```

## Data format

`public/data/index.json`

```json
{ "source": "geotargets-2026-08-12-with-uule.csv", "generated": "...", "total": 273666,
  "columns": ["criteriaId","name","canonicalName","parentId","targetType","status","uule"],
  "countries": [{ "code": "AR", "count": 1234 }, ...] }
```

`public/data/<CC>.json` is an array of rows in the order given by `columns`, for example:

```json
[1000041, "Lujan", "Lujan,Buenos Aires Province,Argentina", 20009, "City", "Active", "w+CAIQIFISCUHGZKaHfbyVEa4iU8WWhwlV"]
```

`uule` is `null` for locations with status `Removal Planned`.

## Notes for development

- Always build URLs to data with `import.meta.env.BASE_URL` (the site lives under `/google-adwords-preview-location/`).
- Use hash-based routing (`createWebHashHistory`) if a router is added; GitHub Pages does not rewrite unknown paths to `index.html`.
- Keep loaded location arrays out of deep reactivity (`shallowRef` / `markRaw`) and render only a limited slice of search results.
- AdWords UULE values use URL-safe base64 without padding. Always pass UULE values through `encodeURIComponent` when building Google URLs.

## Deployment

`.github/workflows/pages.yml` runs on every push to `main` that touches `web/`, a `*-with-uule.csv` file or the workflow itself.
It generates the data, builds the site and deploys it to GitHub Pages.

One-time setup: repository **Settings → Pages → Build and deployment → Source: GitHub Actions**.

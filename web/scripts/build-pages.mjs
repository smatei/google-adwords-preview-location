// After `vite build`, this script takes the generated dist/index.html and creates
// static HTML pages for /countries/ and /country/<cc>/, plus a sitemap.xml.
// It injects SEO meta tags, canonical links, and static fallback content visible
// without JavaScript.
//
// Usage: npm run build   (vite build && node scripts/build-pages.mjs)

import {
  readFileSync,
  writeFileSync,
  mkdirSync,
} from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const dist = join(here, '..', 'dist')
const dataDir = join(here, '..', 'public', 'data')
const basePath = '/google-adwords-preview-location'
const canonicalRoot = 'https://smatei.github.io'

const indexHtmlPath = join(dist, 'index.html')
let indexHtml = readFileSync(indexHtmlPath, 'utf8')

const indexJson = JSON.parse(readFileSync(join(dataDir, 'index.json'), 'utf8'))
const countries = indexJson.countries || []
const sourceFile = indexJson.source || ''
const totalLocations = indexJson.total || 0
const sourceDate = (sourceFile.match(/\d{4}-\d{2}-\d{2}/) || [''])[0]
const csvUrl = sourceFile
  ? `https://github.com/smatei/google-adwords-preview-location/blob/main/${sourceFile}`
  : ''

function escapeHtml(text) {
  return String(text)
    .replace(/\&/g, '&amp;')
    .replace(/\</g, '&lt;')
    .replace(/\>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function fmt(n) {
  return Number(n).toLocaleString('en-US')
}

const rawUrl = sourceFile
  ? `https://raw.githubusercontent.com/smatei/google-adwords-preview-location/refs/heads/main/${sourceFile}`
  : ''

const sourceLink = csvUrl
  ? `<a href="${escapeHtml(csvUrl)}" target="_blank" rel="noopener">Source: ${escapeHtml(sourceFile)}</a> | <a href="${escapeHtml(rawUrl)}" target="_blank" rel="noopener">raw</a>`
  : ''

function buildNav() {
  return [
    `<nav class="top-nav">`,
    `  <a href="${basePath}/">Home</a>`,
    `  <span class="sep">&middot;</span>`,
    `  <a href="${basePath}/countries/">All countries</a>`,
    `  <span class="sep">&middot;</span>`,
    `  ${sourceLink || 'Source data'}`,
    `</nav>`,
  ].join('\n')
}

function buildHead({ title, description, canonical }) {
  let html = indexHtml

  html = html.replace(
    /<title>.*?<\/title>/,
    `<title>${escapeHtml(title)}</title>`,
  )

  const metaDesc = `<meta name="description" content="${escapeHtml(description)}" />`
  if (html.includes('<meta name="description"')) {
    html = html.replace(/\s*<meta name="description"[^>]*>/, metaDesc)
  } else {
    html = html.replace(
      /<meta charset="UTF-8"[^>]*>/,
      match => `${match}\n    ${metaDesc}`,
    )
  }

  const canonicalLink = `<link rel="canonical" href="${escapeHtml(canonical)}" />`
  if (html.includes('<link rel="canonical"')) {
    html = html.replace(/\s*<link rel="canonical"[^>]*>/, canonicalLink)
  } else {
    html = html.replace(
      /<head>/,
      `<head>\n    ${canonicalLink}`,
    )
  }

  return html
}

function buildSeoFallback({ countryHeading, countriesTable, aboutBeforeTable }) {
  const fallback = []
  fallback.push(`<div class="seo-fallback">`)
  fallback.push(buildNav())
  if (countryHeading) {
    fallback.push(`  <h1>${escapeHtml(countryHeading)}</h1>`)
  }
  if (aboutBeforeTable) {
    fallback.push(aboutBeforeTable)
  }
  if (countriesTable) {
    fallback.push('  <p>All countries and the number of Google Ads geotarget locations per country.</p>')
    fallback.push('  <table class="countries-seo-table">')
    fallback.push('    <thead><tr><th>Code</th><th>Country</th><th>Locations</th></tr></thead>')
    fallback.push('    <tbody>')
    for (const c of countries) {
      const href = `${basePath}/country/${c.code.toLowerCase()}/`
      const name = c.name ? escapeHtml(c.name) : c.code
      fallback.push(
        `      <tr><td>${c.code}</td><td><a href="${href}">${name}</a></td><td>${c.count}</td></tr>`,
      )
    }
    fallback.push('    </tbody>')
    fallback.push('  </table>')
  }
  fallback.push(`</div>`)
  return fallback.join('\n')
}

function injectFallbackAndAbout(html, { fallback, about }) {
  html = html.replace(
    /<div id="app">\s*<\/div>/,
    `<div id="app" class="mounted">\n${fallback}\n  </div>`,
  )
  if (about) {
    html = html.replace(
      /<div id="app" class="mounted">[^]*?<\/div>/,
      match => `${match}\n  ${about}`,
    )
  }
  return html
}

function buildPage({ title, description, canonical, countryHeading, countriesTable, about, aboutBeforeTable }) {
  let html = buildHead({ title, description, canonical })
  const fallback = buildSeoFallback({ countryHeading, countriesTable, aboutBeforeTable })
  html = injectFallbackAndAbout(html, { fallback, about })
  return html
}

function buildHomeAbout() {
  return `<section id="about" class="about">
  <h2>What is the Google uule parameter?</h2>
  <p><code>uule</code> is a URL parameter that tells Google Search which location a query should be treated as coming from. Adding <code>&amp;uule=...</code> to a <code>google.com/search</code> URL shows the local results a person in that city, region or postal code would see, without a VPN or proxy in that place.</p>
  <p>This site lists the <code>uule</code> value for every location in the official Google Ads geotargets file: ${fmt(totalLocations)} locations in ${fmt(countries.length)} countries and territories.</p>

  <h2>Where the values come from</h2>
  <p>Google publishes the list of locations that advertisers can target as a CSV file. Each location has a <strong>Criteria ID</strong>, a name, a canonical name such as <code>Lujan,Buenos Aires Province,Argentina</code>, a parent location, a target type and a status.</p>
  <p>For each active location, the <code>uule</code> value was obtained from Google&rsquo;s own ad preview tool, so it is exactly the value Google uses for that Criteria ID. The current data comes from <code>${escapeHtml(sourceFile)}</code>, the geotargets file published on ${sourceDate}. Locations marked <em>Removal Planned</em> are listed but have no <code>uule</code>.</p>

  <h2>How to use it</h2>
  <ol>
    <li>Choose a country, or open its page from <a href="${basePath}/countries/">All countries</a>.</li>
    <li>Find the location with the search box or the target type filter.</li>
    <li>Click <strong>Copy</strong> to copy its <code>uule</code>, or <strong>Test</strong> to open a Google search from that location.</li>
    <li>Add it to your own search URLs: <code>https://www.google.com/search?q=pizza&amp;uule=VALUE&amp;gl=us&amp;hl=en</code>. Always URL-encode the value.</li>
  </ol>

  <h2>Who is this for?</h2>
  <p>SEO specialists checking local rankings, developers building rank trackers or scrapers, and anyone who needs to see Google results as they appear somewhere else. Many SERP API providers identify locations by the same Google Ads Criteria IDs and canonical names, so this table maps each of them directly to the matching <code>uule</code>.</p>

  <h2>Frequently asked questions</h2>
  <h3>Do uule values change?</h3>
  <p>Rarely. Between the June and August 2026 geotargets files, none of the values for locations present in both files changed. New locations are added when Google publishes a new file.</p>
  <h3>Why does a location have no uule?</h3>
  <p>Its status is <em>Removal Planned</em>: Google is retiring it as a targeting option. Use its parent location or a nearby active location instead.</p>
  <h3>Can I download the full list?</h3>
  <p>Yes. The complete CSV with a <code>uule</code> column is available in the <a href="https://github.com/smatei/google-adwords-preview-location">GitHub repository</a>, together with the code that generates it.</p>

  <p class="disclaimer">This is an independent project and is not affiliated with or endorsed by Google.</p>
</section>`
}

function buildCountriesAbout() {
  return `<section id="about" class="about">
  <h2>Google Ads locations by country</h2>
  <p>The table lists all ${fmt(countries.length)} countries and territories in the Google Ads geotargets file, with the number of targetable locations in each one. Open a country to see every location with its Criteria ID, canonical name, target type and <code>uule</code> value.</p>
  <p>The number of locations varies a lot between countries. Large markets include cities, counties, postal codes, neighborhoods and airports, while small territories may have only a few entries.</p>
  <p class="disclaimer">Data source: <code>${escapeHtml(sourceFile)}</code>. Not affiliated with Google.</p>
</section>`
}

function pluralizeType(type, count) {
  const pluralMap = {
    'City': 'cities',
    'County': 'counties',
    'Municipality': 'municipalities',
    'Territory': 'territories',
    'Union Territory': 'union territories',
  }
  const plural = pluralMap[type] || `${type.toLowerCase()}s`
  return count === 1 ? type.toLowerCase() : plural
}

function buildTypeList(rows) {
  const counts = new Map()
  for (const row of rows) {
    const t = row[4]
    counts.set(t, (counts.get(t) || 0) + 1)
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)
  if (sorted.length === 0) return ''
  if (sorted.length === 1) {
    const [type, count] = sorted[0]
    return `${fmt(count)} ${pluralizeType(type, count)}`
  }
  const parts = sorted.map(([type, count]) => `${fmt(count)} ${pluralizeType(type, count)}`)
  if (parts.length === 2) {
    return `${parts[0]} and ${parts[1]}`
  }
  return `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`
}

function pickExample(rows) {
  const city = rows.find(row => row[5] === 'Active' && row[4] === 'City')
  if (city) return city
  const active = rows.find(row => row[5] === 'Active')
  return active || rows[0]
}

function variantFor(code) {
  let sum = 0
  for (const ch of code) sum += ch.charCodeAt(0)
  return sum % 3
}

function buildCountryAbout(c, rows) {
  const Country = c.name
  const CODE = c.code
  const cc = c.code.toLowerCase()
  const N = rows.length
  const active = rows.filter(row => row[5] === 'Active').length
  const removal = rows.filter(row => row[5] === 'Removal Planned').length
  const typeList = buildTypeList(rows)
  const example = pickExample(rows)
  const exampleName = example ? example[1] : ''
  const exampleCanonical = example ? example[2] : ''
  const exampleUule = example ? example[6] : ''
  const exampleUrl = `https://www.google.com/search?q=restaurants&uule=${exampleUule}&gl=${cc}&hl=en`

  const variant = variantFor(CODE)

  const openings = [
    `Google Ads lists ${fmt(N)} geotarget locations in ${Country} (${CODE}), including ${typeList}. This page gives the uule parameter for each of them, so you can see Google Search results as they appear in any of these places.`,
    `There are ${fmt(N)} Google Ads geotarget locations for ${Country} (${CODE}): ${typeList}. Below you will find the Criteria ID, canonical name and uule value of every one of them.`,
    `This page covers all ${fmt(N)} locations that Google Ads can target in ${Country} (${CODE}), including ${typeList}. Each one comes with the uule value Google uses to localize search results for that place.`,
  ]

  const usages = [
    `For example, ${escapeHtml(exampleName)} (${escapeHtml(exampleCanonical)}) has the uule <code>${escapeHtml(exampleUule)}</code>. Add it to a search URL to see local results from there: <a href="${escapeHtml(exampleUrl)}" rel="nofollow">restaurants as seen from ${escapeHtml(exampleName)}</a>.`,
    `To localize a search, append the uule of the place you want. The value for ${escapeHtml(exampleName)} is <code>${escapeHtml(exampleUule)}</code>, and <a href="${escapeHtml(exampleUrl)}" rel="nofollow">this search</a> shows restaurants as Google returns them to a user there.`,
    `Each uule works as a URL parameter. Using ${escapeHtml(exampleName)} as an example, its value is <code>${escapeHtml(exampleUule)}</code>, and the resulting query is <a href="${escapeHtml(exampleUrl)}" rel="nofollow">a Google search for restaurants from ${escapeHtml(exampleName)}</a>.`,
  ]

  const removalSentence = removal > 0
    ? `${fmt(removal)} of these locations are marked Removal Planned and have no uule; Google is retiring them as targeting options.`
    : ''

  return `<section id="about" class="about">
  <h2>Google uule values for ${Country}</h2>
  <p>${openings[variant]}</p>
  <p>${usages[variant]}</p>
  <p>${removalSentence ? removalSentence + ' ' : ''}Use the search box to find a place by name, or filter by target type. Set gl=${cc} to match the country when you build your own Google URLs.</p>
  <p><a href="${basePath}/countries/">Browse all countries</a> &middot; <a href="${basePath}/">What is the uule parameter?</a></p>
</section>`
}

function writePage(path, content) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content, 'utf8')
}

function sitemapXml(urls) {
  const entries = urls
    .map(
      url =>
        `  <url>\n    <loc>${escapeHtml(url)}</loc>\n  </url>`,
    )
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`
}

// Home page
const homeTitle = 'Google UULE generator'
const homeDescription = 'UULE parameters for Google Ads geotarget locations: cities, regions, postal codes and more. Free tool to preview Google search results from any location.'
const homeCanonical = `${canonicalRoot}${basePath}/`
const homeHtml = buildPage({
  title: homeTitle,
  description: homeDescription,
  canonical: homeCanonical,
  countryHeading: 'Google UULE generator',
  about: buildHomeAbout(),
})
writeFileSync(indexHtmlPath, homeHtml, 'utf8')

// Countries listing page
const countriesTitle = 'All countries - Google UULE generator'
const countriesDescription = `List of all ${countries.length} countries with Google Ads geotargets and the number of locations per country.`
const countriesCanonical = `${canonicalRoot}${basePath}/countries/`
const countriesHtml = buildPage({
  title: countriesTitle,
  description: countriesDescription,
  canonical: countriesCanonical,
  countriesTable: true,
  aboutBeforeTable: buildCountriesAbout(),
})
const countriesDir = join(dist, 'countries')
writePage(join(countriesDir, 'index.html'), countriesHtml)

// One page per country
for (const c of countries) {
  const rows = JSON.parse(readFileSync(join(dataDir, `${c.code}.json`), 'utf8'))
  const countryName = c.name || c.code
  const countryTitle = `Google UULE for ${countryName} - ${c.count} AdWords geotarget locations`
  const countryDescription = `UULE parameters for all ${c.count} Google Ads geotarget locations in ${countryName}: cities, regions, postal codes and more.`
  const countryCanonical = `${canonicalRoot}${basePath}/country/${c.code.toLowerCase()}/`
  const countryHtml = buildPage({
    title: countryTitle,
    description: countryDescription,
    canonical: countryCanonical,
    countryHeading: `Google UULE for ${countryName}`,
    about: buildCountryAbout(c, rows),
  })
  writePage(join(dist, 'country', c.code.toLowerCase(), 'index.html'), countryHtml)
}

// Sitemap
const urls = [homeCanonical, countriesCanonical]
for (const c of countries) {
  urls.push(`${canonicalRoot}${basePath}/country/${c.code.toLowerCase()}/`)
}
writeFileSync(join(dist, 'sitemap.xml'), sitemapXml(urls), 'utf8')

console.log(`Generated ${countries.length} country pages, /countries/ and sitemap.xml in ${dist}`)

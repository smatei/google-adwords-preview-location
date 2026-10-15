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
  copyFileSync,
  rmSync,
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
const csvUrl = sourceFile
  ? `https://github.com/smatei/google-adwords-preview-location/blob/main/${sourceFile}`
  : ''

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildPage({ title, description, canonical, countryHeading, countriesTable }) {
  let html = indexHtml

  const rawUrl = sourceFile
    ? `https://raw.githubusercontent.com/smatei/google-adwords-preview-location/refs/heads/main/${sourceFile}`
    : ''

  const sourceLink = csvUrl
    ? `<a href="${escapeHtml(csvUrl)}" target="_blank" rel="noopener">Source: ${escapeHtml(sourceFile)}</a> | <a href="${escapeHtml(rawUrl)}" target="_blank" rel="noopener">raw</a>`
    : ''

  html = html.replace(
    /<title>.*?\/<title>/,
    `<title>${escapeHtml(title)}</title>`,
  )

  const metaDesc = `<meta name="description" content="${escapeHtml(description)}" />`
  if (html.includes('<meta name="description"')) {
    html = html.replace(/\s*<meta name="description"[^\u003e]*>/, metaDesc)
  } else {
    html = html.replace(
      /<meta charset="UTF-8"[^\u003e]*>/,
      match => `${match}\n    ${metaDesc}`,
    )
  }

  const canonicalLink = `<link rel="canonical" href="${escapeHtml(canonical)}" />`
  if (html.includes('<link rel="canonical"')) {
    html = html.replace(/\s*<link rel="canonical"[^\u003e]*>/, canonicalLink)
  } else {
    html = html.replace(
      /<head>/,
      `<head>\n    ${canonicalLink}`,
    )
  }

  const fallback = []
  fallback.push(`<div class="seo-fallback">`)
  fallback.push(`  <nav class="top-nav">`)
  fallback.push(`    <a href="${basePath}/">Home</a>`)
  fallback.push(`    <span class="sep">&middot;</span>`)
  fallback.push(`    <a href="${basePath}/countries/">All countries</a>`)
  fallback.push(`    <span class="sep">&middot;</span>`)
  fallback.push(`    ${sourceLink || 'Source data'}`)
  fallback.push(`  </nav>`)
  if (countryHeading) {
    fallback.push(`  <h1>${escapeHtml(countryHeading)}</h1>`)
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

  const fallbackHtml = fallback.join('\n')

  html = html.replace(
    /<div id="app">\s*<\/div>/,
    `<div id="app"\u003e\n${fallbackHtml}\n  </div\u003e`,
  )

  return html
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
  return `\u003c?xml version="1.0" encoding="UTF-8"?\u003e\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\u003e\n${entries}\n</urlset\u003e\n`
}

// Home page
const homeTitle = 'Google UULE generator'
const homeDescription = 'UULE parameters for Google Ads geotarget locations: cities, regions, postal codes and more. Free tool to preview Google search results from any location.'
const homeCanonical = `${canonicalRoot}${basePath}/`
const homeHtml = buildPage({
  title: homeTitle,
  description: homeDescription,
  canonical: homeCanonical,
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
})
const countriesDir = join(dist, 'countries')
writePage(join(countriesDir, 'index.html'), countriesHtml)

// One page per country
for (const c of countries) {
  const countryName = c.name || c.code
  const countryTitle = `Google UULE for ${countryName} - ${c.count} AdWords geotarget locations`
  const countryDescription = `UULE parameters for all ${c.count} Google Ads geotarget locations in ${countryName}: cities, regions, postal codes and more.`
  const countryCanonical = `${canonicalRoot}${basePath}/country/${c.code.toLowerCase()}/`
  const countryHtml = buildPage({
    title: countryTitle,
    description: countryDescription,
    canonical: countryCanonical,
    countryHeading: `Google UULE for ${countryName}`,
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

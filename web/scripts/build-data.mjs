// Converts the newest geotargets-YYYY-MM-DD-with-uule.csv from the repository root
// into per-country JSON files that the page loads on demand.
//
// Output (web/public/data/):
//   index.json  { source, generated, total, columns, countries: [{ code, count }] }
//   <CC>.json   [[criteriaId, name, canonicalName, parentId, targetType, status, uule], ...]
//
// Usage: npm run data            (newest file)
//        npm run data -- <file>  (specific file)

import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(here, '..', '..')
const outDir = join(here, '..', 'public', 'data')

const source =
  process.argv[2] ??
  join(
    repoRoot,
    readdirSync(repoRoot)
      .filter((f) => /^geotargets-\d{4}-\d{2}-\d{2}-with-uule\.csv$/.test(f))
      .sort()
      .at(-1),
  )

// Minimal RFC 4180 parser: quoted fields, "" escapes, CRLF or LF line endings.
function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else quoted = false
      } else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field); rows.push(row); row = []; field = ''
    } else field += c
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row) }
  return rows
}

const [header, ...rows] = parseCsv(readFileSync(source, 'utf8'))
const col = Object.fromEntries(header.map((h, i) => [h, i]))
for (const name of ['Criteria ID', 'Name', 'Canonical Name', 'Parent ID', 'Country Code', 'Target Type', 'Status', 'UULE']) {
  if (!(name in col)) throw new Error(`Missing column "${name}" in ${source}`)
}

const byCountry = new Map()
for (const r of rows) {
  if (r.length < header.length) continue
  const cc = r[col['Country Code']] || 'XX'
  if (!byCountry.has(cc)) byCountry.set(cc, [])
  byCountry.get(cc).push([
    Number(r[col['Criteria ID']]),
    r[col['Name']],
    r[col['Canonical Name']],
    r[col['Parent ID']] ? Number(r[col['Parent ID']]) : null,
    r[col['Target Type']],
    r[col['Status']],
    r[col['UULE']] || null,
  ])
}

rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })

const countries = [...byCountry.keys()].sort().map((code) => {
  writeFileSync(join(outDir, `${code}.json`), JSON.stringify(byCountry.get(code)))
  return { code, count: byCountry.get(code).length }
})

const total = countries.reduce((s, c) => s + c.count, 0)
writeFileSync(
  join(outDir, 'index.json'),
  JSON.stringify({
    source: basename(source),
    generated: new Date().toISOString(),
    total,
    columns: ['criteriaId', 'name', 'canonicalName', 'parentId', 'targetType', 'status', 'uule'],
    countries,
  }),
)

console.log(`${basename(source)}: ${total} locations, ${countries.length} countries -> ${outDir}`)

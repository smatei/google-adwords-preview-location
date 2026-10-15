<script setup>
import { ref, computed, watch, onMounted } from 'vue'

const index = ref(null)
const routeCountry = ref('')
const routeView = ref('home')
const selectedCountry = ref('US')
const aboutVariant = ref(0)
const selectedTargetType = ref('')

const countryOpening = computed(() => {
  const c = countryByCode(routeCountry.value)
  if (!c) return ''
  const rows = countryData.value
  const typeList = buildTypeList(rows)
  const N = rows.length
  const variants = [
    `Google Ads lists ${fmt(N)} geotarget locations in ${c.name} (${c.code}), including ${typeList}. This page gives the uule parameter for each of them, so you can see Google Search results as they appear in any of these places.`,
    `There are ${fmt(N)} Google Ads geotarget locations for ${c.name} (${c.code}): ${typeList}. Below you will find the Criteria ID, canonical name and uule value of every one of them.`,
    `This page covers all ${fmt(N)} locations that Google Ads can target in ${c.name} (${c.code}), including ${typeList}. Each one comes with the uule value Google uses to localize search results for that place.`,
  ]
  return variants[aboutVariant.value]
})

const countryUsage = computed(() => {
  const c = countryByCode(routeCountry.value)
  if (!c) return ''
  const example = pickExample(countryData.value)
  if (!example) return ''
  const cc = c.code.toLowerCase()
  const exampleName = example[1]
  const exampleCanonical = example[2]
  const exampleUule = example[6]
  const exampleUrl = aboutExampleUrl(example, cc)
  const variants = [
    `For example, ${exampleName} (${exampleCanonical}) has the uule ${exampleUule}. Add it to a search URL to see local results from there: restaurants as seen from ${exampleName}.`,
    `To localize a search, append the uule of the place you want. The value for ${exampleName} is ${exampleUule}, and this search shows restaurants as Google returns them to a user there.`,
    `Each uule works as a URL parameter. Using ${exampleName} as an example, its value is ${exampleUule}, and the resulting query is a Google search for restaurants from ${exampleName}.`,
  ]
  return variants[aboutVariant.value]
})

const countryRemovalSentence = computed(() => {
  const removal = countryData.value.filter(row => row[5] === 'Removal Planned').length
  if (removal <= 0) return ''
  return `${fmt(removal)} of these locations are marked Removal Planned and have no uule; Google is retiring them as targeting options. `
})
const countryData = ref([])
const page = ref(1)
const pageSize = 1000
const query = ref('')
const selectedLocation = ref(null)

const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, '')
const canonicalRoot = 'https://smatei.github.io'

function parsePath() {
  const path = window.location.pathname
  const base = baseUrl || ''
  const rest = path.startsWith(base) ? path.slice(base.length) : path
  const segments = rest.split('/').filter(Boolean)
  if (segments[0] === 'country' && segments[1]) {
    return { view: 'country', country: segments[1].toUpperCase() }
  }
  if (segments[0] === 'countries') {
    return { view: 'countries', country: '' }
  }
  return { view: 'home', country: '' }
}

function getInitialParams() {
  const params = new URLSearchParams(window.location.search)
  return {
    page: Math.max(1, parseInt(params.get('page') || '1', 10)),
    targetType: params.get('targetType') || '',
  }
}

function updateUrl() {
  const route = parsePath()
  if (route.view !== 'country') return
  const params = new URLSearchParams()
  if (page.value > 1) params.set('page', String(page.value))
  if (selectedTargetType.value) params.set('targetType', selectedTargetType.value)
  const qs = params.toString()
  const url = `${baseUrl}/country/${selectedCountry.value.toLowerCase()}/${qs ? '?' + qs : ''}`
  window.history.replaceState({}, '', url)
}

function setDocumentTitle() {
  const route = parsePath()
  if (route.view === 'countries') {
    document.title = 'All countries - Google UULE generator'
    return
  }
  if (route.view === 'country') {
    const c = index.value?.countries.find(c => c.code === route.country)
    const name = c?.name || route.country
    document.title = `Google UULE for ${name} - ${c?.count ?? ''} AdWords geotarget locations`.replace(/\s*-\s*$/, '')
    return
  }
  document.title = 'Google UULE generator'
}

function hideLoadingScreen() {
  const loading = document.getElementById('loading')
  if (loading) loading.hidden = true
}

onMounted(async () => {
  const route = parsePath()
  routeView.value = route.view
  const initial = getInitialParams()
  page.value = initial.page
  selectedTargetType.value = initial.targetType

  const res = await fetch(`${import.meta.env.BASE_URL}data/index.json`)
  if (!res.ok) {
    hideLoadingScreen()
    return
  }
  index.value = await res.json()
  setDocumentTitle()

  if (route.view === 'countries') {
    routeCountry.value = ''
    selectedCountry.value = ''
    hideLoadingScreen()
    return
  }

  let cc = route.country || 'US'
  if (!index.value.countries.some(c => c.code === cc)) {
    cc = index.value.countries[0]?.code || ''
  }
  routeCountry.value = cc
  selectedCountry.value = cc
  aboutVariant.value = variantFor(cc)
  await loadCountry(cc)
  hideLoadingScreen()
})

watch(selectedCountry, (cc, oldCc) => {
  if (!cc || cc === oldCc) return
  page.value = 1
  query.value = ''
  selectedLocation.value = null
  selectedTargetType.value = ''

  const route = parsePath()
  if (route.view === 'country' && route.country !== cc) {
    window.location.href = `${baseUrl}/country/${cc.toLowerCase()}/`
    return
  }

  routeCountry.value = cc
  aboutVariant.value = variantFor(cc)
  loadCountry(cc)
  updateUrl()
})

watch([page, selectedTargetType], updateUrl)

async function loadCountry(cc) {
  if (!cc) {
    countryData.value = []
    return
  }
  const res = await fetch(`${import.meta.env.BASE_URL}data/${cc}.json`)
  if (res.ok) {
    countryData.value = await res.json()
  } else {
    countryData.value = []
  }
}

const targetTypes = computed(() => {
  const types = new Set()
  for (const row of countryData.value) types.add(row[4])
  return [...types].sort()
})

const filteredRows = computed(() => {
  if (!selectedTargetType.value) return countryData.value
  return countryData.value.filter(row => row[4] === selectedTargetType.value)
})

const totalPages = computed(() => Math.ceil(filteredRows.value.length / pageSize))

const paginatedRows = computed(() => {
  const start = (page.value - 1) * pageSize
  return filteredRows.value.slice(start, start + pageSize)
})

watch(totalPages, (tp) => {
  if (page.value > tp) page.value = Math.max(1, tp)
})

const autocompleteMatches = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q || !countryData.value.length) return []
  return countryData.value
    .filter(row => row[1].toLowerCase().startsWith(q) || row[2].toLowerCase().startsWith(q))
    .slice(0, 20)
})

function selectLocation(row) {
  selectedLocation.value = row
  query.value = ''
}

function countryByCode(code) {
  return index.value?.countries.find(c => c.code === code)
}

function countryLabel(c) {
  return c.name ? `${c.code} - ${c.name}` : c.code
}

function countryHref(c) {
  return `${baseUrl}/country/${c.code.toLowerCase()}/`
}

function parent(row) {
  return row[3] ?? '-'
}

function uule(row) {
  return row[6] || ''
}

function testUrl(row) {
  return `https://www.google.com/search?q=${encodeURIComponent(row[1])}&uule=${uule(row)}`
}

async function copyUule(row) {
  const text = uule(row)
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  }
}

function goToPage(n) {
  page.value = Math.max(1, Math.min(totalPages.value, n))
}

function setTargetType(type) {
  selectedTargetType.value = type
  page.value = 1
}

function allCountriesHref() {
  return `${baseUrl}/countries/`
}

function homeHref() {
  return `${baseUrl}/`
}

function csvSourceHref() {
  return `https://github.com/smatei/google-adwords-preview-location/blob/main/${index.value?.source || ''}`
}

function csvRawHref() {
  return `https://raw.githubusercontent.com/smatei/google-adwords-preview-location/refs/heads/main/${index.value?.source || ''}`
}

function fmt(n) {
  return Number(n).toLocaleString('en-US')
}

function sourceDate(source) {
  const m = String(source).match(/\d{4}-\d{2}-\d{2}/)
  return m ? m[0] : ''
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

function aboutExampleUrl(example, cc) {
  return `https://www.google.com/search?q=restaurants&uule=${example[6]}&gl=${cc}&hl=en`
}

</script>

<template>
  <main>
    <nav class="top-nav" v-if="index">
      <a :href="homeHref()">Home</a>
      <span class="sep">&middot;</span>
      <a :href="allCountriesHref()">All countries</a>
      <span class="sep">&middot;</span>
      <a :href="csvSourceHref()" target="_blank" rel="noopener">Source: {{ index.source }}</a>
      <span class="sep">&middot;</span>
      <a :href="csvRawHref()" target="_blank" rel="noopener">raw</a>
    </nav>

    <div v-if="!index">Loading data...</div>

    <template v-else-if="parsePath().view === 'countries'">
      <h1>All countries</h1>
      <p class="meta">{{ index.total }} locations across {{ index.countries.length }} countries</p>

      <section id="about" class="about">
        <h2>Google Ads locations by country</h2>
        <p>The table lists all {{ fmt(index.countries.length) }} countries and territories in the Google Ads geotargets file, with the number of targetable locations in each one. Open a country to see every location with its Criteria ID, canonical name, target type and <code>uule</code> value.</p>
        <p>The number of locations varies a lot between countries. Large markets include cities, counties, postal codes, neighborhoods and airports, while small territories may have only a few entries.</p>
        <p class="disclaimer">Data source: <code>{{ index.source }}</code>. Not affiliated with Google.</p>
      </section>

      <table class="countries-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Country</th>
            <th>Locations</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in index.countries" :key="c.code">
            <td>{{ c.code }}</td>
            <td>
              <a :href="countryHref(c)">{{ c.name || c.code }}</a>
            </td>
            <td>{{ c.count }}</td>
          </tr>
        </tbody>
      </table>
    </template>

    <template v-else>
      <h1 v-if="countryByCode(routeCountry)?.name">
        Google UULE for {{ countryByCode(routeCountry).name }}
      </h1>
      <h1 v-else>Google UULE generator</h1>

      <p v-if="index">
        Source: {{ index.source }} | {{ index.total }} locations | {{ index.countries.length }} countries
      </p>

      <section class="controls">
        <label>
          Country
          <select v-model="selectedCountry">
            <option v-for="c in index.countries" :key="c.code" :value="c.code">
              {{ countryLabel(c) }} ({{ c.count }})
            </option>
          </select>
        </label>

        <label v-if="targetTypes.length">
          Target Type
          <select :value="selectedTargetType" @change="setTargetType($event.target.value)">
            <option value="">All ({{ filteredRows.length }})</option>
            <option v-for="t in targetTypes" :key="t" :value="t">
              {{ t }} ({{ countryData.filter(r => r[4] === t).length }})
            </option>
          </select>
        </label>

        <label class="search">
          Search location
          <input v-model="query" type="text" placeholder="e.g. New York" />
          <ul v-if="query.trim() && autocompleteMatches.length" class="autocomplete">
            <li
              v-for="row in autocompleteMatches"
              :key="row[0]"
              @click="selectLocation(row)"
            >
              {{ row[1] }} - {{ row[2] }}
            </li>
          </ul>
          <p v-else-if="query.trim() && !autocompleteMatches.length" class="no-results">No matches</p>
        </label>
      </section>

      <section v-if="selectedLocation" class="details">
        <h2>Selected location</h2>
        <dl>
          <dt>Criteria ID</dt><dd>{{ selectedLocation[0] }}</dd>
          <dt>Name</dt><dd>{{ selectedLocation[1] }}</dd>
          <dt>Canonical Name</dt><dd>{{ selectedLocation[2] }}</dd>
          <dt>Parent ID</dt><dd>{{ parent(selectedLocation) }}</dd>
          <dt>Target Type</dt><dd>{{ selectedLocation[4] }}</dd>
          <dt>Status</dt><dd>{{ selectedLocation[5] }}</dd>
          <dt>UULE</dt>
          <dd class="uule nowrap">{{ uule(selectedLocation) }}</dd>
        </dl>
        <div class="actions">
          <button @click="copyUule(selectedLocation)">Copy UULE</button>
          <a :href="testUrl(selectedLocation)" target="_blank" rel="noopener">Test on Google</a>
        </div>
      </section>

      <section v-if="countryData.length">
        <h2>Locations in {{ selectedCountry }}</h2>
        <p class="meta">{{ filteredRows.length }} locations | page {{ page }} of {{ totalPages }}</p>

        <nav class="pagination">
          <button :disabled="page <= 1" @click="goToPage(1)">First</button>
          <button :disabled="page <= 1" @click="goToPage(page - 1)">Previous</button>
          <span>Page {{ page }} of {{ totalPages }}</span>
          <button :disabled="page >= totalPages" @click="goToPage(page + 1)">Next</button>
          <button :disabled="page >= totalPages" @click="goToPage(totalPages)">Last</button>
        </nav>

        <table>
          <thead>
            <tr>
              <th>Criteria ID</th>
              <th>Name</th>
              <th>Canonical Name</th>
              <th>Parent ID</th>
              <th>Target Type</th>
              <th>Status</th>
              <th class="uule-col">UULE</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in paginatedRows" :key="row[0]">
              <td>{{ row[0] }}</td>
              <td>{{ row[1] }}</td>
              <td>{{ row[2] }}</td>
              <td>{{ parent(row) }}</td>
              <td>{{ row[4] }}</td>
              <td>{{ row[5] }}</td>
              <td class="uule-col">
                <span class="uule nowrap">{{ uule(row) }}</span>
                <div class="uule-actions">
                  <button v-if="uule(row)" @click="copyUule(row)">Copy</button>
                  <a v-if="uule(row)" :href="testUrl(row)" target="_blank" rel="noopener">Test</a>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <nav class="pagination">
          <button :disabled="page <= 1" @click="goToPage(1)">First</button>
          <button :disabled="page <= 1" @click="goToPage(page - 1)">Previous</button>
          <span>Page {{ page }} of {{ totalPages }}</span>
          <button :disabled="page >= totalPages" @click="goToPage(page + 1)">Next</button>
          <button :disabled="page >= totalPages" @click="goToPage(totalPages)">Last</button>
        </nav>
      </section>
    </template>

    <section id="about" class="about" v-if="index">
      <template v-if="routeView === 'country' && countryByCode(routeCountry)">
        <h2>Google uule values for {{ countryByCode(routeCountry).name }}</h2>
        <p>{{ countryOpening }}</p>
        <p>{{ countryUsage }}</p>
        <p>{{ countryRemovalSentence }}Use the search box to find a place by name, or filter by target type. Set gl={{ routeCountry.toLowerCase() }} to match the country when you build your own Google URLs.</p>
        <p><a :href="allCountriesHref()">Browse all countries</a> &middot; <a :href="homeHref()">What is the uule parameter?</a></p>
      </template>

      <template v-else>
        <h2>What is the Google uule parameter?</h2>
        <p><code>uule</code> is a URL parameter that tells Google Search which location a query should be treated as coming from. Adding <code>&amp;uule=...</code> to a <code>google.com/search</code> URL shows the local results a person in that city, region or postal code would see, without a VPN or proxy in that place.</p>
        <p>This site lists the <code>uule</code> value for every location in the official Google Ads geotargets file: {{ fmt(index.total) }} locations in {{ fmt(index.countries.length) }} countries and territories.</p>

        <h2>Where the values come from</h2>
        <p>Google publishes the list of locations that advertisers can target as a CSV file. Each location has a <strong>Criteria ID</strong>, a name, a canonical name such as <code>Lujan,Buenos Aires Province,Argentina</code>, a parent location, a target type and a status.</p>
        <p>For each active location, the <code>uule</code> value was obtained from Google&rsquo;s own ad preview tool, so it is exactly the value Google uses for that Criteria ID. The current data comes from <code>{{ index.source }}</code>, the geotargets file published on {{ sourceDate(index.source) }}. Locations marked <em>Removal Planned</em> are listed but have no <code>uule</code>.</p>

        <h2>How to use it</h2>
        <ol>
          <li>Choose a country, or open its page from <a :href="allCountriesHref()">All countries</a>.</li>
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
      </template>
    </section>
  </main>
</template>

<style scoped>
main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.top-nav {
  margin-bottom: 1rem;
}

.top-nav a {
  text-decoration: none;
  color: #0066cc;
}

.top-nav a:hover {
  text-decoration: underline;
}

.sep {
  margin: 0 0.5rem;
  color: #666;
}

.controls {
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
  flex-wrap: wrap;
  margin: 1rem 0;
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-weight: 600;
}

select, input[type="text"] {
  padding: 0.4rem 0.6rem;
  font-size: 1rem;
}

.search {
  position: relative;
  min-width: 300px;
}

.autocomplete {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  max-height: 220px;
  overflow-y: auto;
  margin: 0.25rem 0 0;
  padding: 0;
  list-style: none;
  background: #fff;
  border: 1px solid #ccc;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

.autocomplete li {
  padding: 0.5rem;
  cursor: pointer;
}

.autocomplete li:hover {
  background: #f0f0f0;
}

.no-results {
  margin: 0.25rem 0 0;
  color: #666;
}

.details {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  padding: 1rem;
  margin: 1rem 0;
  border-radius: 0.5rem;
}

dl {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.5rem 1rem;
}

dt {
  font-weight: 600;
}

.actions, .uule-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 0.75rem;
}

.actions a, .uule-actions a {
  text-decoration: none;
  color: #0066cc;
}

.actions a:hover, .uule-actions a:hover {
  text-decoration: underline;
}

.meta {
  color: #666;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
  font-size: 0.9rem;
}

th, td {
  border: 1px solid #ddd;
  padding: 0.5rem;
  text-align: left;
  vertical-align: top;
}

th {
  background: #f2f2f2;
}

.countries-table td:nth-child(3) {
  text-align: right;
}

.uule-col {
  max-width: 320px;
}

.uule {
  font-family: monospace;
  word-break: keep-all;
}

.nowrap {
  white-space: nowrap;
  overflow-x: auto;
  display: inline-block;
  max-width: 100%;
}

.uule-actions button {
  font-size: 0.75rem;
  padding: 0.2rem 0.4rem;
}

.pagination {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  justify-content: center;
  margin: 1rem 0;
}

button {
  padding: 0.4rem 0.8rem;
  cursor: pointer;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'

const index = ref(null)
const routeCountry = ref('')
const selectedCountry = ref('US')
const selectedTargetType = ref('')
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

onMounted(async () => {
  const route = parsePath()
  const initial = getInitialParams()
  page.value = initial.page
  selectedTargetType.value = initial.targetType

  const res = await fetch(`${import.meta.env.BASE_URL}data/index.json`)
  if (!res.ok) return
  index.value = await res.json()

  if (route.view === 'countries') {
    routeCountry.value = ''
    selectedCountry.value = ''
    return
  }

  let cc = route.country || 'US'
  if (!index.value.countries.some(c => c.code === cc)) {
    cc = index.value.countries[0]?.code || ''
  }
  routeCountry.value = cc
  selectedCountry.value = cc
  loadCountry(cc)
})

watch(selectedCountry, (cc, oldCc) => {
  if (!cc || cc === oldCc) return
  page.value = 1
  query.value = ''
  selectedLocation.value = null
  selectedTargetType.value = ''

  const route = parsePath()
  if (route.view === 'country') {
    window.location.href = `${baseUrl}/country/${cc.toLowerCase()}/`
    return
  }

  routeCountry.value = cc
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
  if (res.ok) countryData.value = await res.json()
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
  return `https://www.google.com/search?q=${encodeURIComponent(row[1])}&uule=${encodeURIComponent(uule(row))}`
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
</script>

<template>
  <main>
    <nav class="top-nav">
      <a :href="homeHref()">Home</a>
      <span class="sep">&middot;</span>
      <a :href="allCountriesHref()">All countries</a>
    </nav>

    <div v-if="!index">Loading data...</div>

    <template v-else-if="parsePath().view === 'countries'">
      <h1>All countries</h1>
      <p class="meta">{{ index.total }} locations across {{ index.countries.length }} countries</p>

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

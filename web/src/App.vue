<script setup>
import { ref, computed, watch, onMounted } from 'vue'

const index = ref(null)
const selectedCountry = ref('US')
const countryData = ref([])
const page = ref(1)
const pageSize = 1000
const query = ref('')
const selectedLocation = ref(null)

onMounted(async () => {
  const res = await fetch(`${import.meta.env.BASE_URL}data/index.json`)
  if (res.ok) {
    index.value = await res.json()
    // Default to US if available, otherwise first country
    if (!index.value.countries.some(c => c.code === 'US')) {
      selectedCountry.value = index.value.countries[0]?.code || ''
    }
    loadCountry(selectedCountry.value)
  }
})

watch(selectedCountry, (cc) => {
  page.value = 1
  query.value = ''
  selectedLocation.value = null
  loadCountry(cc)
})

async function loadCountry(cc) {
  if (!cc) {
    countryData.value = []
    return
  }
  const res = await fetch(`${import.meta.env.BASE_URL}data/${cc}.json`)
  if (res.ok) countryData.value = await res.json()
}

const totalPages = computed(() => Math.ceil(countryData.value.length / pageSize))

const paginatedRows = computed(() => {
  const start = (page.value - 1) * pageSize
  return countryData.value.slice(start, start + pageSize)
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

function countryLabel(c) {
  return c.name ? `${c.code} — ${c.name}` : c.code
}

function parent(row) {
  return row[3] ?? '-'
}

function uule(row) {
  return row[6] ?? '-'
}
</script>

<template>
  <main>
    <h1>Google UULE generator</h1>

    <p v-if="index">
      Source: {{ index.source }} · {{ index.total }} locations · {{ index.countries.length }} countries
    </p>
    <p v-else>Loading data…</p>

    <section v-if="index" class="controls">
      <label>
        Country
        <select v-model="selectedCountry">
          <option v-for="c in index.countries" :key="c.code" :value="c.code">
            {{ countryLabel(c) }} ({{ c.count }})
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
            {{ row[1] }} — {{ row[2] }}
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
        <dt>UULE</dt><dd class="uule">{{ uule(selectedLocation) }}</dd>
      </dl>
    </section>

    <section v-if="countryData.length">
      <h2>Locations in {{ selectedCountry }}</h2>
      <p class="meta">{{ countryData.length }} locations · page {{ page }} of {{ totalPages }}</p>

      <table>
        <thead>
          <tr>
            <th>Criteria ID</th>
            <th>Name</th>
            <th>Canonical Name</th>
            <th>Parent ID</th>
            <th>Target Type</th>
            <th>Status</th>
            <th>UULE</th>
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
            <td class="uule">{{ uule(row) }}</td>
          </tr>
        </tbody>
      </table>

      <nav class="pagination">
        <button :disabled="page <= 1" @click="page--">Previous</button>
        <span>Page {{ page }} of {{ totalPages }}</span>
        <button :disabled="page >= totalPages" @click="page++">Next</button>
      </nav>
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
}

th {
  background: #f2f2f2;
}

.uule {
  font-family: monospace;
  word-break: break-all;
  max-width: 250px;
}

.pagination {
  display: flex;
  gap: 1rem;
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
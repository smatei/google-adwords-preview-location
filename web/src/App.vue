<script setup>
import { ref, onMounted } from 'vue'

// Data files are generated at build time into public/data (see scripts/build-data.mjs).
// import.meta.env.BASE_URL resolves to the GitHub Pages sub-path in production.
const index = ref(null)

onMounted(async () => {
  const res = await fetch(`${import.meta.env.BASE_URL}data/index.json`)
  if (res.ok) index.value = await res.json()
})
</script>

<template>
  <main>
    <h1>Google UULE generator</h1>
    <p v-if="index">
      Source: {{ index.source }} · {{ index.total }} locations · {{ index.countries.length }} countries
    </p>
    <p v-else>Loading data…</p>
  </main>
</template>

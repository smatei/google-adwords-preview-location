import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// GitHub Pages serves the site from https://<user>.github.io/<repo>/,
// so every asset URL must be prefixed with the repository name.
export default defineConfig({
  base: '/google-adwords-preview-location/',
  plugins: [vue()],
})

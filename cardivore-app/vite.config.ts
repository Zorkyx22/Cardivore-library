import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss(), react(), wasm()],
  worker: {
    plugins: () => [wasm()],
  },
  optimizeDeps: {
    exclude: ['cardivore_library'],
  },
  build: {
    target: 'esnext',
  },
})

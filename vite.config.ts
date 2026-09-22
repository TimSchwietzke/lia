import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  // Desktop app loading from disk: one big bundle is fine (mostly syntax highlighting grammars).
  build: { chunkSizeWarningLimit: 4000 },
  test: {
    include: ['src/**/*.test.ts'],
  },
})

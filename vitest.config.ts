import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@gameon/ui': r('./packages/ui/src/index.tsx'),
      '@gameon/domain': r('./packages/domain/src/index.ts'),
      '@gameon/supabase': r('./packages/supabase/src/index.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: [
      'apps/**/src/**/*.{test,spec}.{ts,tsx}',
      'packages/**/src/**/*.{test,spec}.{ts,tsx}',
    ],
  },
})

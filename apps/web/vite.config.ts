import { fileURLToPath } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const apiProxyTarget = process.env.LISTCOLLAB_WEB_PROXY_TARGET ?? 'http://127.0.0.1:4301'

export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false,
  },
  resolve: {
    alias: {
      '@listcollab/shared': fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/api': apiProxyTarget,
    },
  },
  preview: {
    proxy: {
      '/api': apiProxyTarget,
    },
  },
})

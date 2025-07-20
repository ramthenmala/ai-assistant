import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  css: {
    postcss: './postcss.config.js',
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    exclude: ['better-sqlite3'],
  },
  build: {
    rollupOptions: {
      external: ['better-sqlite3'],
    },
  },
})
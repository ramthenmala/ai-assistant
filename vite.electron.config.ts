import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    ssr: true,
    lib: {
      entry: {
        main: resolve(__dirname, 'electron/main.ts'),
        preload: resolve(__dirname, 'electron/preload.ts'),
      },
      formats: ['cjs'],
    },
    rollupOptions: {
      external: ['electron', 'path', 'fs', 'url'],
    },
    outDir: 'dist-electron',
    emptyOutDir: true,
  },
})
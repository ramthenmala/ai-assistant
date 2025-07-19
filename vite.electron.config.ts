import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    lib: {
      entry: {
        main: resolve(__dirname, 'electron/main.ts'),
        preload: resolve(__dirname, 'electron/preload.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: ['electron'],
    },
    outDir: 'dist-electron',
    emptyOutDir: true,
  },
})
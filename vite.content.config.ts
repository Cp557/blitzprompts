import { readFileSync } from "node:fs"
import path from "path"
import { defineConfig } from "vite"
import { resolve } from 'path'

// Separate config for content script - outputs as IIFE with all deps bundled
export default defineConfig({
  plugins: [
    {
      name: 'bundle-blitzprompts-font',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'fonts/inter-latin-wght-normal.woff2',
          source: readFileSync(resolve(__dirname, 'node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2')),
        })
        this.emitFile({
          type: 'asset',
          fileName: 'licenses/Inter-OFL.txt',
          source: readFileSync(resolve(__dirname, 'node_modules/@fontsource-variable/inter/LICENSE')),
        })
      },
    },
  ],
  build: {
    emptyOutDir: false, // Don't clear dist, main build already ran
    rollupOptions: {
      input: {
        content: resolve(__dirname, 'src/content/index.js')
      },
      output: {
        dir: 'dist',
        entryFileNames: '[name].js',
        format: 'iife', // Self-executing function, no imports
        inlineDynamicImports: true,
      },
    },
    // Ensure we're not minifying in a way that breaks things
    minify: 'esbuild',
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})

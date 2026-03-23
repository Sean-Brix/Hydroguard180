import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],

  // Build configuration - output to server/public for deployment
  build: {
    outDir: path.resolve(__dirname, './server/public'),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return

          if (id.includes('maplibre-gl')) return 'vendor-maps'
          if (
            id.includes('jspdf') ||
            id.includes('html2canvas') ||
            id.includes('canvg') ||
            id.includes('dompurify')
          ) {
            return 'vendor-pdf'
          }
          if (
            id.includes('recharts') ||
            id.includes('victory-vendor') ||
            id.includes('d3-')
          ) {
            return 'vendor-charts'
          }
          if (id.includes('motion')) return 'vendor-motion'
          if (
            id.includes('react') ||
            id.includes('scheduler') ||
            id.includes('react-router')
          ) {
            return 'vendor-react'
          }
        },
      },
    },
  },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'dcr-modeler': path.resolve(__dirname, 'dcr-js/modeler/index.js'),
      'dcr-engine': path.resolve(__dirname, 'dcr-js/dcr-engine/index.ts')
    }
  },
  optimizeDeps: {
    include: ['bpmn-js']
  },
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
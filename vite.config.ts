import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'dcr-modeler': path.resolve(__dirname, 'lib/dcr-modeler/index.js'),
      'dcr-engine': path.resolve(__dirname, 'src/lib/dcr-engine/index.ts')
    }
  },
  optimizeDeps: {
    include: ['bpmn-js', 'elkjs', 'web-worker']
  },
  server: {
    port: 3001,
    host: true,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '.railway.app',
      '.up.railway.app'
    ],
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
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
    include: ['bpmn-js', 'elkjs', 'web-worker'],
    exclude: ['pyodide']
  },
  server: {
    port: 3001,
    host: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  },
  build: {
    target: 'esnext'
  }
})
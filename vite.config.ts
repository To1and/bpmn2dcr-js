import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  // 如果部署到 GitHub Pages，需要设置 base
  // 格式: base: '/仓库名/'
  // 例如: base: '/bpmn2dcr-js/'
  // 如果是自定义域名或根路径，使用: base: '/'
  base: process.env.GITHUB_PAGES === 'true' ? '/bpmn2dcr-js/' : '/',

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
    target: 'esnext',
    outDir: 'dist'
  }
})
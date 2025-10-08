import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    allowedHosts: true,
    hmr: {
      protocol: 'wss',
      clientPort: 443
    }
  },
  assetsInclude: ['**/*.md'],
  base: '/'
})

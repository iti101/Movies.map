import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const noviTarget = (
    env.VITE_NOVI_BASE_URL || 'https://novi-backend-api-wgsgz.ondigitalocean.app'
  ).replace(/\/$/, '')

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        // Avoid browser CORS: NOVI only allows http://localhost:5173
        '/novi': {
          target: noviTarget,
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/novi/, ''),
        },
      },
    },
  }
})

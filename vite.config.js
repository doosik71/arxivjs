import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    base: './', // Important for Electron
    publicDir: 'assets', // Avoid conflict with build output
    server: {
      host: env.HOST || 'localhost',
      // Keep the Vite dev server on its own port so it never competes with the backend.
      port: parseInt(env.VITE_PORT, 10) || 5173,
      proxy: {
        '/api': {
          target: env.TARGET || 'http://localhost:8765',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      }
    },
    build: {
      outDir: 'public',
      assetsDir: 'assets',
      emptyOutDir: false,
      rollupOptions: {
        output: {
          manualChunks: undefined
        }
      }
    }
  }
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5182,
    proxy: {
      '/labeling': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost',
        changeOrigin: true,
        ...(process.env.VITE_BACKEND_URL
          ? { rewrite: (path: string) => path.replace(/^\/labeling/, '') }
          : {}),
      },
      '/auth': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost',
        changeOrigin: true,
      },
    },
  }
})

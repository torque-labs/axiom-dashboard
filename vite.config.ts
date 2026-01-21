import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/cubejs-api': {
        target: 'https://cube.torque.so',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})

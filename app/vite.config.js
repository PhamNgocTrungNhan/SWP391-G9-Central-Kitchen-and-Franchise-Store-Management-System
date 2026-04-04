import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/** Cùng một proxy cho `npm run dev` và `npm run preview` — trước đây preview không proxy nên mọi `/api` trả 404. */
const apiProxy = {
  '/api': {
    target: 'http://localhost:5202',
    changeOrigin: true,
    secure: false,
  },
}

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: apiProxy,
  },
  preview: {
    proxy: apiProxy,
  },
})

import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Build web autonome pour Capacitor/Android (UI React + backend mobile injecté).
export default defineConfig({
  root: __dirname,
  base: './',
  plugins: [react()],
  build: {
    outDir: 'mobile/www',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'mobile-index.html')
    }
  }
})

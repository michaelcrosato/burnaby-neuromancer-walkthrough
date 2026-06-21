import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: true,
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, '/');
          if (normalizedId.includes('node_modules')) {
            if (normalizedId.includes('node_modules/three/')) {
              return 'three';
            }
            if (normalizedId.includes('node_modules/@react-three/fiber/')) {
              return 'fiber';
            }
          }
        }
      }
    }
  }
})


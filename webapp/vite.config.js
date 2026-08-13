import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared')
    }
  },
  server: {
    port: 5173,
    strictPort: true,
    host: true, // Needed for exposing via ngrok
    allowedHosts: ['nonstandard-ashli-pachydermatous.ngrok-free.dev'],
    proxy: {
      '/api': 'http://127.0.0.1:5000'
    }
  },
  build: {
    target: 'esnext',
    minify: 'esbuild', // Faster minification
    esbuild: {
      drop: ['console', 'debugger'], // 🛡️ Zero-Trust Security: Prevent Client-Side Leakage
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          tfjs: ['@tensorflow/tfjs', '@tensorflow-models/mobilenet'],
          ui: ['recharts', 'qrcode']
        }
      }
    }
  }
})

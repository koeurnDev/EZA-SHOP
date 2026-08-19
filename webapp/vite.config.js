import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { copyFileSync, mkdirSync, existsSync } from 'fs'

// Plugin to copy functions folder to dist
const copyFunctionsPlugin = () => ({
  name: 'copy-functions',
  closeBundle() {
    const src = path.resolve(__dirname, 'functions');
    const dest = path.resolve(__dirname, 'dist/functions');
    
    if (existsSync(src)) {
      if (!existsSync(dest)) {
        mkdirSync(dest, { recursive: true });
      }
      
      // Copy functions/api/[[path]].js
      const apiDir = path.join(dest, 'api');
      if (!existsSync(apiDir)) {
        mkdirSync(apiDir, { recursive: true });
      }
      copyFileSync(
        path.join(src, 'api/[[path]].js'),
        path.join(apiDir, '[[path]].js')
      );
      console.log('✅ Copied functions folder to dist');
    }
  }
});

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), copyFunctionsPlugin()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared')
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.js',
  },
  server: {
    port: 5173,
    strictPort: true,
    host: true,
    hmr: {
      overlay: false, // Disable error overlay
    },
    watch: {
      usePolling: false, // Reduce CPU usage
      ignored: ['**/node_modules/**', '**/.git/**']
    },
    // No proxy — API calls go directly to Cloudflare Workers
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
          charts: ['recharts'],
          ui: ['qrcode']
        }
      }
    }
  }
})

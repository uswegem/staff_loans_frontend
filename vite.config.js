import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The dev server proxies /api to the backend so the app and API share one origin:
// the SameSite=Strict refresh cookie and the CSRF cookie then work without CORS.
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Libraries change far less often than the app, so they get their own chunk:
        // browsers keep it cached across deploys. One chunk, not several: splitting
        // MUI and React apart creates a start-up cycle between chunks in the build.
        manualChunks(id) {
          return id.includes('node_modules') ? 'vendor' : undefined;
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: { '/api': { target: process.env.VITE_API_PROXY || 'http://localhost:4000', changeOrigin: false } },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{js,jsx}'], // e2e/ belongs to Playwright
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    css: false,
    testTimeout: 40000,
  },
});

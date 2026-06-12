import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 5173,
    // Poll for changes so edits are picked up over Docker bind mounts.
    watch: { usePolling: true, interval: 300 },
    proxy: {
      '/api': {
        // Local-dev fallback only. In Docker the browser calls the backend
        // directly via VITE_API_BASE (see docker-compose.yml), so this proxy
        // is not used there.
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});

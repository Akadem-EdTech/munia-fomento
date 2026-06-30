import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // El frontend habla con la API en :4000 vía proxy (cookies same-origin en dev).
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
});

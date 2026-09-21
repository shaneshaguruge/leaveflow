import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // The browser calls /api on 5173; Vite forwards it to Express on 4000 (same origin, no CORS).
  server: { port: 5173, strictPort: true, proxy: { '/api': 'http://localhost:4000' } },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    include: ['src/**/*.test.{js,jsx}'],
  },
});

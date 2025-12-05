import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Render 部署通常是部署在根目錄，所以設為 '/'
  base: '/', 
  server: {
    port: 80,
  },
});
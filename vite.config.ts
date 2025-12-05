import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // TODO: 如果你的 repo 名稱是 xml-validator，請填寫 '/xml-validator/'
  // 如果你是部署到 username.github.io (User Page)，則填寫 '/'
  base: '/', 
  server: {
    port: 80,
  },
});
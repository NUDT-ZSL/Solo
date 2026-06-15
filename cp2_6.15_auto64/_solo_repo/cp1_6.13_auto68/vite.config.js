import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// =====================================================================
// Vite 配置 - 客户端开发服务器
// 端口 3000，将 /socket.io 请求代理到后端 3001
// =====================================================================
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
        changeOrigin: true
      }
    }
  }
});

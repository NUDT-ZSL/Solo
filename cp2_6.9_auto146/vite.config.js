import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [basicSsl()],
  server: {
    https: true,
    port: 5173,
    open: true
  },
  build: {
    target: 'es2020',
    sourcemap: true
  }
});

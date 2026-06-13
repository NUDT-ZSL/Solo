import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  server: {
    open: true,
  },
  resolve: {
    alias: {
      'rollup': '@rollup/wasm-node',
    },
  },
});

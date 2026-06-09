import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2020',
  },
  esbuild: {
    tsconfigRaw: {
      compilerOptions: {
        strict: true,
        target: 'ES2020',
      },
    },
  },
});

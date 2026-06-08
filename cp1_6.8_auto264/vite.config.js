import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    root: '.',
    base: './',
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
    },
    server: {
      port: 3000,
      open: true,
    },
    define: {
      __APP_ENV__: JSON.stringify(env.MODE || mode),
    },
  };
});

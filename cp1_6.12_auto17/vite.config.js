import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    open: true
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    outDir: './dist',
    sourcemap: true
  },
  resolve: {
    extensions: ['.ts', '.js', '.d.ts']
  },
  esbuild: {
    tsconfigRaw: {
      compilerOptions: {
        strict: true,
        target: 'ESNext',
        module: 'ESNext',
        moduleResolution: 'bundler',
        skipLibCheck: true,
        noUnusedLocals: true,
        noUnusedParameters: true
      }
    }
  }
});

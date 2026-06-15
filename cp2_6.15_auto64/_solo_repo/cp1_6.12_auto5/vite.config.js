import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import traeSoloBadge from 'vite-plugin-trae-solo-badge';

export default defineConfig({
  plugins: [react(), tsconfigPaths(), traeSoloBadge()],
  server: {
    host: true,
    port: 5173,
  },
});

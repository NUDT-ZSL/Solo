import { defineConfig } from 'vite';
import net from 'net';

function findAvailablePort(startPort = 3000, maxAttempts = 50) {
  return new Promise((resolve, reject) => {
    let port = startPort;
    let attempts = 0;

    function tryPort() {
      const server = net.createServer();
      
      server.once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          attempts++;
          if (attempts >= maxAttempts) {
            reject(new Error(`Could not find available port after ${maxAttempts} attempts`));
          } else {
            port++;
            tryPort();
          }
        } else {
          reject(err);
        }
      });

      server.once('listening', () => {
        server.close();
        resolve(port);
      });

      server.listen(port, '127.0.0.1');
    }

    tryPort();
  });
}

export default defineConfig(async () => {
  const port = await findAvailablePort(3000, 50);
  console.log(`Using port: ${port}`);

  return {
    server: {
      port: port,
      strictPort: false,
      open: false,
      host: true
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      minify: 'esbuild'
    }
  };
});

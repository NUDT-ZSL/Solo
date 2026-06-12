import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serverPath = path.join(__dirname, 'server', 'index.ts');

const child = spawn('npx', ['tsx', serverPath], {
  stdio: 'inherit',
  shell: true,
  cwd: __dirname,
});

child.on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

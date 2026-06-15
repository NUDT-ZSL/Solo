import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const sessionId = args[args.indexOf('--session') + 1] || 'default';
const outdir = args[args.indexOf('--outdir') + 1] || '.dbg';
const clean = args.includes('--clean');
const idleTimeout = parseInt(args[args.indexOf('--idle') + 1] || '0', 10) || 0;
const portArgIndex = args.indexOf('--port');
let port = portArgIndex >= 0 ? parseInt(args[portArgIndex + 1], 10) : 7777;
if (isNaN(port) || port < 0 || port > 65535) port = 7777;

const outdirAbs = path.resolve(outdir);
if (!fs.existsSync(outdirAbs)) {
  fs.mkdirSync(outdirAbs, { recursive: true });
}

const logFile = path.join(outdirAbs, `trae-debug-log-${sessionId}.ndjson`);
const envFile = path.join(outdirAbs, `${sessionId}.env`);

if (clean && fs.existsSync(logFile)) {
  fs.truncateSync(logFile, 0);
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

let lastActivity = Date.now();

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/event') {
    let body = '';
    req.on('data', (chunk) => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const event = JSON.parse(body);
        event.ts = event.ts || Date.now();
        event.sessionId = event.sessionId || sessionId;
        
        fs.appendFileSync(logFile, JSON.stringify(event) + '\n');
        
        lastActivity = Date.now();
        res.writeHead(200, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', received: true }));
      } catch (e) {
        res.writeHead(400, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    const logCount = fs.existsSync(logFile) 
      ? fs.readFileSync(logFile, 'utf8').split('\n').filter(Boolean).length 
      : 0;
    res.writeHead(200, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'running',
      uptime: Date.now() - startTime,
      logCount,
      sessionId,
    }));
    return;
  }

  if (req.method === 'DELETE' && req.url === '/logs') {
    if (fs.existsSync(logFile)) {
      fs.truncateSync(logFile, 0);
    }
    res.writeHead(200, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'cleared' }));
    return;
  }

  res.writeHead(404, CORS_HEADERS);
  res.end('Not Found');
});

let startTime = Date.now();
let actualPort = port;

function tryListen(p) {
  return new Promise((resolve, reject) => {
    const s = server.listen(p, '127.0.0.1', () => {
      actualPort = p;
      resolve(p);
    }).on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        s.close();
        reject(err);
      } else {
        reject(err);
      }
    });
  });
}

async function start() {
  for (let i = 0; i < 10; i++) {
    try {
      await tryListen(port + i);
      break;
    } catch (e) {
      if (i === 9) throw e;
    }
  }

  const apiUrl = `http://127.0.0.1:${actualPort}/event`;
  fs.writeFileSync(envFile, `DEBUG_SERVER_URL=${apiUrl}\nDEBUG_SESSION_ID=${sessionId}\n`);

  console.log(`@@DEBUG_SERVER_INFO`);
  console.log(JSON.stringify({
    api_url: apiUrl,
    session_id: sessionId,
    log_dir: outdirAbs,
    log_file: logFile,
    env_file: envFile,
  }, null, 2));
  console.log(`@@END_DEBUG_SERVER_INFO`);
  console.log(`\nDebug Server running on ${apiUrl}`);
  console.log(`Session: ${sessionId}`);
  console.log(`Log file: ${logFile}`);
  console.log(`Env file: ${envFile}`);

  if (idleTimeout > 0) {
    setInterval(() => {
      if (Date.now() - lastActivity > idleTimeout * 1000) {
        console.log(`Idle timeout reached, exiting.`);
        process.exit(0);
      }
    }, 10000);
  }
}

start().catch((err) => {
  console.error('Failed to start debug server:', err);
  process.exit(1);
});

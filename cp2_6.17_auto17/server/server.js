const express = require('express');
const http = require('http');
const cors = require('cors');

const { createWsServer } = require('./wsServer');
const { runCode } = require('./runCode');

const PORT = 3001;

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json({ limit: '10mb' }));

createWsServer(server);

app.post('/api/runCode', runCode);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
});

module.exports = app;

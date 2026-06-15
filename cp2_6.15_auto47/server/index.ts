import express from 'express';
import http from 'http';
import cors from 'cors';
import './db';
import { registerRoutes } from './routes';
import { setupWebSocket } from './wsServer';

const app = express();
const server = http.createServer(app);
const PORT = 3001;

app.use(cors());
app.use(express.json());

const { broadcast } = setupWebSocket(server);
registerRoutes(app, broadcast);

server.listen(PORT, () => {
  console.log('Server running on port 3001');
});

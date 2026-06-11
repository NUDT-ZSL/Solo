import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import booksRouter from './routes/books';
import exchangesRouter, { setSocketIO } from './routes/exchanges';
import { initDatabase } from './database';

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

setSocketIO(io);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/books', booksRouter);
app.use('/api/exchanges', exchangesRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId as string;
  console.log(`User connected: ${userId}, socket id: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${userId}, socket id: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;

const startServer = async () => {
  await initDatabase();

  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`API: http://localhost:${PORT}/api`);
  });
};

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import recipeRouter, { setRecipeIO } from './routes/recipes';
import activityRouter, { setActivityIO } from './routes/activities';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

app.use(cors());
app.use(express.json());

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

app.use('/api/recipes', recipeRouter);
app.use('/api/activities', activityRouter);

setRecipeIO(io);
setActivityIO(io);

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-recipe-room', (roomId) => {
    socket.join(`recipe-${roomId}`);
  });

  socket.on('join-activity-room', (activityId) => {
    socket.join(`activity-${activityId}`);
  });

  socket.on('leave-activity-room', (activityId) => {
    socket.leave(`activity-${activityId}`);
  });

  socket.join('recipe-updates');

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log('Server running on port 3001');
});

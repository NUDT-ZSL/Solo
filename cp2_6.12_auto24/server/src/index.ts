import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { petManager } from './petManager';
import { PetState, PetType } from '../../shared/types';

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST'],
  },
});

const rooms: Map<string, Set<string>> = new Map();

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

petManager.startDecay((pet: PetState) => {
  rooms.forEach((members, roomId) => {
    if (members.has(pet.ownerId)) {
      io.to(roomId).emit('pet-updated', { pet });
    }
  });
});

io.on('connection', (socket) => {
  const ownerId = socket.handshake.query.ownerId as string || uuidv4();
  socket.data.ownerId = ownerId;

  socket.on('join-room', ({ roomId }: { roomId: string }) => {
    socket.join(roomId);
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    rooms.get(roomId)!.add(ownerId);

    const roomPets: Record<string, PetState> = {};
    rooms.get(roomId)!.forEach((memberId) => {
      const pet = petManager.getPet(memberId);
      if (pet) roomPets[memberId] = pet;
    });

    socket.emit('room-state', { roomId, pets: roomPets });
    socket.to(roomId).emit('pet-joined', { ownerId });

    console.log(`User ${ownerId} joined room ${roomId}`);
  });

  socket.on('select-pet', ({ type, name, roomId }: { type: PetType; name: string; roomId: string }) => {
    const pet = petManager.createPet(ownerId, name, type);
    io.to(roomId).emit('pet-updated', { pet });
    console.log(`User ${ownerId} selected ${type} named ${name}`);
  });

  socket.on('action', ({ type, roomId }: { type: 'feed' | 'play' | 'train'; roomId: string }) => {
    let result: { pet: PetState; event: any } | null = null;

    switch (type) {
      case 'feed':
        result = petManager.feed(ownerId);
        break;
      case 'play':
        result = petManager.play(ownerId);
        break;
      case 'train':
        result = petManager.train(ownerId);
        break;
    }

    if (result) {
      io.to(roomId).emit('pet-updated', { pet: result.pet });
      socket.emit('action-result', { pet: result.pet, event: result.event });
    }
  });

  socket.on('disconnect', () => {
    rooms.forEach((members, roomId) => {
      if (members.has(ownerId)) {
        members.delete(ownerId);
        const pet = petManager.removePet(ownerId);
        if (pet) {
          io.to(roomId).emit('pet-left', { ownerId });
        }
        if (members.size === 0) {
          rooms.delete(roomId);
        }
        console.log(`User ${ownerId} left room ${roomId}`);
      }
    });
  });
});

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

import { io, Socket } from 'socket.io-client';

const socket: Socket = io({
  transports: ['websocket', 'polling'],
});

export default socket;

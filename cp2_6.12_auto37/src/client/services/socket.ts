import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io('/', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
  }
  return socket;
};

export const joinActivityRoom = (activityId: string): void => {
  const s = getSocket();
  s.emit('join-activity-room', activityId);
};

export const leaveActivityRoom = (activityId: string): void => {
  const s = getSocket();
  s.emit('leave-activity-room', activityId);
};

export const joinRecipeRoom = (recipeId: string): void => {
  const s = getSocket();
  s.emit('join-recipe-room', recipeId);
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

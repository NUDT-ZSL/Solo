import { Server as SocketIOServer, Socket } from 'socket.io';
import { getMembersByProjectId } from './projectsStore';

interface ConnectedSocket {
  socket: Socket;
  userId: string;
  projectIds: string[];
}

const connectedSockets = new Map<string, ConnectedSocket>();

let io: SocketIOServer | null = null;

export function initNotifications(serverIo: SocketIOServer): void {
  io = serverIo;

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('join-project', (data: { projectId: string; userId: string }) => {
      const { projectId, userId } = data;
      console.log(`User ${userId} joining project ${projectId}`);

      let conn = connectedSockets.get(socket.id);
      if (!conn) {
        conn = { socket, userId, projectIds: [] };
        connectedSockets.set(socket.id, conn);
      }

      if (!conn.projectIds.includes(projectId)) {
        conn.projectIds.push(projectId);
        socket.join(`project-${projectId}`);
      }
    });

    socket.on('leave-project', (data: { projectId: string }) => {
      const { projectId } = data;
      const conn = connectedSockets.get(socket.id);
      if (conn) {
        conn.projectIds = conn.projectIds.filter((id) => id !== projectId);
        socket.leave(`project-${projectId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      connectedSockets.delete(socket.id);
    });
  });
}

export function broadcastToProject(
  projectId: string,
  event: string,
  data: unknown,
  excludeSocketId?: string
): void {
  if (!io) return;

  const room = `project-${projectId}`;
  if (excludeSocketId) {
    io.to(room).except(excludeSocketId).emit(event, data);
  } else {
    io.to(room).emit(event, data);
  }
}

export function sendToUser(userId: string, event: string, data: unknown): void {
  if (!io) return;

  for (const [, conn] of connectedSockets) {
    if (conn.userId === userId) {
      conn.socket.emit(event, data);
    }
  }
}

export function notifyCardUpdated(projectId: string, card: unknown, changerEmail: string): void {
  broadcastToProject(projectId, 'card-updated', {
    card,
    changerEmail,
    timestamp: new Date().toISOString(),
  });
}

export function notifyCardCreated(projectId: string, card: unknown, creatorEmail: string): void {
  broadcastToProject(projectId, 'card-created', {
    card,
    creatorEmail,
    timestamp: new Date().toISOString(),
  });
}

export function notifyCardDeleted(projectId: string, cardId: string, deleterEmail: string): void {
  broadcastToProject(projectId, 'card-deleted', {
    cardId,
    deleterEmail,
    timestamp: new Date().toISOString(),
  });
}

export function notifyCommentAdded(
  projectId: string,
  comment: unknown,
  cardTitle: string
): void {
  broadcastToProject(projectId, 'comment-added', {
    comment,
    cardTitle,
    timestamp: new Date().toISOString(),
  });
}

export function notifyMemberJoined(projectId: string, member: unknown): void {
  broadcastToProject(projectId, 'member-joined', {
    member,
    timestamp: new Date().toISOString(),
  });
}

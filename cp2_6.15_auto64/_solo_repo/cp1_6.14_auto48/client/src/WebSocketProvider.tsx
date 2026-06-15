import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface LockedNode {
  nodeId: string;
  userId: string;
  nickname: string;
  color: string;
}

interface WebSocketContextType {
  socket: Socket | null;
  connected: boolean;
  lockedNodes: Map<string, LockedNode>;
  joinStory: (storyId: string) => void;
  leaveStory: (storyId: string) => void;
  lockNode: (storyId: string, nodeId: string, userId: string, nickname: string, color: string) => void;
  unlockNode: (storyId: string, nodeId: string, userId: string) => void;
  onNodeCreated: (callback: (data: { storyId: string; node: any }) => void) => void;
}

const WebSocketContext = createContext<WebSocketContextType>({
  socket: null,
  connected: false,
  lockedNodes: new Map(),
  joinStory: () => {},
  leaveStory: () => {},
  lockNode: () => {},
  unlockNode: () => {},
  onNodeCreated: () => {},
});

export function useWebSocket() {
  return useContext(WebSocketContext);
}

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [lockedNodes, setLockedNodes] = useState<Map<string, LockedNode>>(new Map());

  useEffect(() => {
    const newSocket = io({ transports: ['websocket', 'polling'] });
    setSocket(newSocket);

    newSocket.on('connect', () => setConnected(true));
    newSocket.on('disconnect', () => setConnected(false));

    newSocket.on('node:locked', (data: LockedNode) => {
      setLockedNodes(prev => {
        const next = new Map(prev);
        next.set(data.nodeId, data);
        return next;
      });
    });

    newSocket.on('node:unlocked', (data: { nodeId: string }) => {
      setLockedNodes(prev => {
        const next = new Map(prev);
        next.delete(data.nodeId);
        return next;
      });
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const joinStory = useCallback((storyId: string) => {
    socket?.emit('join:story', { storyId });
  }, [socket]);

  const leaveStory = useCallback((storyId: string) => {
    socket?.emit('leave:story', { storyId });
  }, [socket]);

  const lockNode = useCallback((storyId: string, nodeId: string, userId: string, nickname: string, color: string) => {
    socket?.emit('node:lock', { storyId, nodeId, userId, nickname, color });
  }, [socket]);

  const unlockNode = useCallback((storyId: string, nodeId: string, userId: string) => {
    socket?.emit('node:unlock', { storyId, nodeId, userId });
  }, [socket]);

  const onNodeCreated = useCallback((callback: (data: { storyId: string; node: any }) => void) => {
    socket?.on('node:created', callback);
    return () => {
      socket?.off('node:created', callback);
    };
  }, [socket]);

  return (
    <WebSocketContext.Provider value={{ socket, connected, lockedNodes, joinStory, leaveStory, lockNode, unlockNode, onNodeCreated }}>
      {children}
    </WebSocketContext.Provider>
  );
}

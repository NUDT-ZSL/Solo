import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { WebSocketContextType } from '../types';

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
};

interface WebSocketProviderProps {
  children: React.ReactNode;
}

const STORAGE_KEY_PLAYER_ID = 'bubble_poker_player_id';
const STORAGE_KEY_ROOM_ID = 'bubble_poker_room_id';
const STORAGE_KEY_PLAYER_NAME = 'bubble_poker_player_name';

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [playerName, setPlayerName] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_PLAYER_NAME) || '';
  });
  const [savedPlayerId, setSavedPlayerId] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY_PLAYER_ID);
  });
  const [savedRoomId, setSavedRoomId] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY_ROOM_ID);
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isReconnectingRef = useRef(false);

  const saveGameState = useCallback((playerId: string, roomId: string) => {
    localStorage.setItem(STORAGE_KEY_PLAYER_ID, playerId);
    localStorage.setItem(STORAGE_KEY_ROOM_ID, roomId);
    setSavedPlayerId(playerId);
    setSavedRoomId(roomId);
  }, []);

  const clearGameState = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_PLAYER_ID);
    localStorage.removeItem(STORAGE_KEY_ROOM_ID);
    setSavedPlayerId(null);
    setSavedRoomId(null);
  }, []);

  const handleSetPlayerName = useCallback((name: string) => {
    localStorage.setItem(STORAGE_KEY_PLAYER_NAME, name);
    setPlayerName(name);
  }, []);

  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      const websocket = new WebSocket(wsUrl);
      let hasOpened = false;

      websocket.onopen = () => {
        console.log('WebSocket connected');
        hasOpened = true;
        setWs(websocket);
        wsRef.current = websocket;

        if (isReconnectingRef.current && savedPlayerId && savedRoomId) {
          console.log('Attempting to reconnect to game...');
          websocket.send(JSON.stringify({
            type: 'reconnect',
            playerId: savedPlayerId,
            roomId: savedRoomId,
          }));
        }
        isReconnectingRef.current = false;
      };

      websocket.onclose = () => {
        console.log('WebSocket disconnected');
        setWs(null);
        wsRef.current = null;

        if (hasOpened && savedPlayerId && savedRoomId) {
          isReconnectingRef.current = true;
        }

        if (!reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            connect();
          }, 3000);
        }
      };

      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }, [savedPlayerId, savedRoomId]);

  useEffect(() => {
    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  const sendMessage = useCallback(
    (message: any) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(message));
      }
    },
    []
  );

  return (
    <WebSocketContext.Provider
      value={{
        ws,
        sendMessage,
        playerName,
        setPlayerName: handleSetPlayerName,
        savedPlayerId,
        savedRoomId,
        saveGameState,
        clearGameState,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export default WebSocketContext;

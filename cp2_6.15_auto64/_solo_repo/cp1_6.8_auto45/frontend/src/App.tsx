import React, { useState, useCallback } from 'react';
import Lobby from './Lobby';
import GameBoard from './GameBoard';
import type { RoomState } from './types';

export default function App() {
  const [view, setView] = useState<'lobby' | 'game'>('lobby');
  const [room, setRoom] = useState<RoomState | null>(null);
  const [playerName, setPlayerName] = useState('');

  const handleJoinRoom = useCallback((roomState: RoomState, name: string) => {
    setRoom(roomState);
    setPlayerName(name);
    setView('game');
  }, []);

  const handleLeaveRoom = useCallback(() => {
    setRoom(null);
    setPlayerName('');
    setView('lobby');
  }, []);

  return (
    <div className="app-container">
      {view === 'lobby' && (
        <Lobby onJoinRoom={handleJoinRoom} />
      )}
      {view === 'game' && room && (
        <GameBoard
          initialRoom={room}
          playerName={playerName}
          onLeave={handleLeaveRoom}
        />
      )}
    </div>
  );
}

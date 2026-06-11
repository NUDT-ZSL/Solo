import type { Socket } from 'socket.io-client';
import type { Room, RoomState, ChatMessage } from '../../../shared/types.js';

interface LobbyProps {
  socket: Socket;
  rooms: Room[];
  nickname: string;
  roomState: RoomState | null;
  chatMessages: ChatMessage[];
  isConnected: boolean;
}

export default function Lobby(_props: LobbyProps) {
  return null;
}

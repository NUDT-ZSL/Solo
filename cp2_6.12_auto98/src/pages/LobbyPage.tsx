import { useEffect } from 'react';
import { useStore } from '../store';
import RoomManager from '../components/RoomManager';

export default function LobbyPage() {
  const { fetchRooms } = useStore();

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  return (
    <div className="lobby-page">
      <div className="lobby-hero">
        <h1 className="lobby-title">故事织机</h1>
        <p className="lobby-subtitle">多人异步故事接龙 · AI续写辅助</p>
      </div>
      <div className="lobby-content">
        <RoomManager />
      </div>
    </div>
  );
}

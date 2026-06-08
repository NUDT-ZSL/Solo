import React, { useState, useEffect, useCallback } from 'react';
import type { RoomState } from './types';
import { fetchRooms, createRoom, joinRoom, fetchCategories } from './api';

interface LobbyProps {
  onJoinRoom: (room: RoomState, playerName: string) => void;
}

export default function Lobby({ onJoinRoom }: LobbyProps) {
  const [rooms, setRooms] = useState<RoomState[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [playerName, setPlayerName] = useState(() => {
    return localStorage.getItem('echo_riddles_name') || '';
  });
  const [showCreate, setShowCreate] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomCategory, setNewRoomCategory] = useState('all');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (playerName) {
      localStorage.setItem('echo_riddles_name', playerName);
    }
  }, [playerName]);

  const loadRooms = useCallback(async () => {
    try {
      const data = await fetchRooms(search, category);
      setRooms(data);
    } catch {
      // silently fail
    }
  }, [search, category]);

  useEffect(() => {
    loadRooms();
    const interval = setInterval(loadRooms, 5000);
    return () => clearInterval(interval);
  }, [loadRooms]);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
  }, []);

  const handleCreate = async () => {
    if (!playerName.trim()) {
      setError('请输入你的昵称');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const room = await createRoom(
        newRoomName || '回响灯谜',
        playerName.trim(),
        newRoomCategory
      );
      onJoinRoom(room, playerName.trim());
    } catch {
      setError('创建房间失败');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (code: string) => {
    if (!playerName.trim()) {
      setError('请先输入你的昵称');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const room = await joinRoom(code, playerName.trim());
      onJoinRoom(room, playerName.trim());
    } catch (e: any) {
      setError(e?.response?.data?.error || '加入房间失败');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickJoin = async () => {
    if (!joinCode.trim()) return;
    await handleJoin(joinCode.trim().toUpperCase());
  };

  return (
    <div className="lobby">
      <div className="lobby-bg-glow" />

      <header className="lobby-header">
        <h1 className="lobby-title">
          <span className="title-glow">🏮 回响灯谜</span>
        </h1>
        <p className="lobby-subtitle">合作解谜 · 点亮智慧</p>
      </header>

      <div className="lobby-controls">
        <div className="player-name-input">
          <label>你的昵称</label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="输入昵称..."
            maxLength={12}
          />
        </div>

        <div className="search-bar">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 搜索房间..."
          />
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">全部分类</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="quick-actions">
          <div className="quick-join">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="输入房间号"
              maxLength={6}
            />
            <button onClick={handleQuickJoin} disabled={loading}>
              加入
            </button>
          </div>
          <button
            className="create-btn"
            onClick={() => setShowCreate(!showCreate)}
          >
            ✨ 创建房间
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="create-panel">
          <h3>创建新房间</h3>
          <div className="create-form">
            <input
              type="text"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="房间名称（默认：回响灯谜）"
              maxLength={20}
            />
            <select
              value={newRoomCategory}
              onChange={(e) => setNewRoomCategory(e.target.value)}
            >
              <option value="all">全部谜题</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button
              className="start-btn"
              onClick={handleCreate}
              disabled={loading}
            >
              {loading ? '创建中...' : '🚀 创建并加入'}
            </button>
          </div>
        </div>
      )}

      {error && <div className="error-toast">{error}</div>}

      <div className="room-list">
        {rooms.length === 0 ? (
          <div className="empty-rooms">
            <p>🌙 暂无公开房间</p>
            <p>创建一个房间，邀请朋友来玩吧！</p>
          </div>
        ) : (
          rooms.map((room) => (
            <div key={room.code} className="room-card">
              <div className="room-card-header">
                <h3>🏮 {room.name}</h3>
                <span className="room-status-badge">{room.status === 'waiting' ? '等待中' : '游戏中'}</span>
              </div>
              <div className="room-card-info">
                <span>🏷 {room.category === 'all' ? '全部分类' : room.category}</span>
                <span>👥 {room.players.length}/{room.maxPlayers}</span>
                <span>🔑 {room.code}</span>
              </div>
              <div className="room-card-players">
                {room.players.map((p) => (
                  <span key={p} className="player-mini-tag">{p}</span>
                ))}
              </div>
              <button
                className="join-room-btn"
                onClick={() => handleJoin(room.code)}
                disabled={loading || room.players.length >= room.maxPlayers}
              >
                {room.players.length >= room.maxPlayers ? '已满' : '加入'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

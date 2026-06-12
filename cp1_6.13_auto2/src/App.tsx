import React, { useState, useEffect, useCallback } from 'react';
import type { Room } from './types';
import { MEMBER_COLORS } from './types';
import SearchPanel from './components/SearchPanel';
import VotingPanel from './components/VotingPanel';
import FinalItinerary from './components/FinalItinerary';
import {
  getSocket,
  createRoom,
  getRoom,
  joinRoom,
  generateUserId,
  getUserName,
  setUserName,
  disconnectSocket,
  resetToSearch,
} from './utils/roomManager';
import './styles/App.css';

const App: React.FC = () => {
  const [room, setRoom] = useState<Room | null>(null);
  const [userId] = useState<string>(() => generateUserId());
  const [userName, setUserNameState] = useState<string>(() => getUserName());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [showNameInput, setShowNameInput] = useState<boolean>(false);
  const [tempName, setTempName] = useState<string>(userName);
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');
  const [showJoinModal, setShowJoinModal] = useState<boolean>(false);
  const [joinError, setJoinError] = useState<string>('');

  useEffect(() => {
    const socket = getSocket();

    socket.on('room-updated', (updatedRoom: Room) => {
      setRoom(updatedRoom);
    });

    socket.on('error', (error: string) => {
      console.error('Socket error:', error);
    });

    const initRoom = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const roomCode = urlParams.get('room');

      if (roomCode) {
        try {
          const existingRoom = await getRoom(roomCode);
          joinRoom(roomCode, userId, userName);
          setRoom(existingRoom);
        } catch {
          setJoinError('房间不存在，请检查邀请码');
        }
      }
      setIsLoading(false);
    };

    initRoom();

    return () => {
      socket.off('room-updated');
      socket.off('error');
    };
  }, [userId, userName]);

  const handleCreateRoom = useCallback(async () => {
    try {
      setIsLoading(true);
      const newRoom = await createRoom(userId, userName);
      joinRoom(newRoom.code, userId, userName);
      setRoom(newRoom);
      window.history.pushState({}, '', `?room=${newRoom.code}`);
    } catch (error) {
      console.error('Failed to create room:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, userName]);

  const handleJoinRoom = useCallback(async () => {
    const code = joinCodeInput.trim().toUpperCase();
    if (!code || code.length !== 6) {
      setJoinError('请输入6位邀请码');
      return;
    }
    try {
      setIsLoading(true);
      setJoinError('');
      const existingRoom = await getRoom(code);
      joinRoom(code, userId, userName);
      setRoom(existingRoom);
      window.history.pushState({}, '', `?room=${code}`);
      setShowJoinModal(false);
      setJoinCodeInput('');
    } catch {
      setJoinError('房间不存在，请检查邀请码');
    } finally {
      setIsLoading(false);
    }
  }, [joinCodeInput, userId, userName]);

  const handleCopyCode = useCallback(() => {
    if (room) {
      navigator.clipboard.writeText(room.code);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  }, [room]);

  const handleSaveName = useCallback(() => {
    if (tempName.trim()) {
      setUserName(tempName.trim());
      setUserNameState(tempName.trim());
      setShowNameInput(false);
      if (room) {
        joinRoom(room.code, userId, tempName.trim());
      }
    }
  }, [tempName, room, userId]);

  const handleResetToSearch = useCallback(() => {
    resetToSearch();
  }, []);

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>加载中...</p>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="app-landing">
        <div className="landing-hero">
          <h1 className="landing-title">TravelSage</h1>
          <p className="landing-subtitle">和朋友们一起规划完美旅行</p>
          <div className="landing-actions">
            <button className="btn-primary" onClick={handleCreateRoom}>
              创建旅行房间
            </button>
            <button className="btn-secondary" onClick={() => setShowJoinModal(true)}>
              加入已有房间
            </button>
          </div>
        </div>

        {showJoinModal && (
          <div className="modal-overlay" onClick={() => setShowJoinModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>加入房间</h3>
              <input
                type="text"
                placeholder="输入6位邀请码"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                maxLength={6}
                className="modal-input"
              />
              {joinError && <p className="modal-error">{joinError}</p>}
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setShowJoinModal(false)}>
                  取消
                </button>
                <button className="btn-primary" onClick={handleJoinRoom}>
                  加入
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="app-container">
      <nav className="navbar">
        <div className="navbar-left">
          <div className="navbar-logo">TravelSage</div>
          <div className="member-avatars">
            {room.members.map((member) => (
              <div
                key={member.id}
                className="member-avatar"
                style={{ backgroundColor: MEMBER_COLORS[member.colorIndex] }}
                title={member.name}
              >
                {member.name.charAt(0).toUpperCase()}
              </div>
            ))}
          </div>
        </div>

        <div className="navbar-center">
          <div className="phase-indicator">
            <span className={`phase-step ${room.phase === 'search' ? 'active' : ''}`}>
              1. 收集灵感
            </span>
            <span className="phase-divider">→</span>
            <span className={`phase-step ${room.phase === 'voting' ? 'active' : ''}`}>
              2. 投票决定
            </span>
            <span className="phase-divider">→</span>
            <span className={`phase-step ${room.phase === 'final' ? 'active' : ''}`}>
              3. 生成清单
            </span>
          </div>
        </div>

        <div className="navbar-right">
          {room.phase !== 'search' && (
            <button className="btn-text" onClick={handleResetToSearch}>
              重新开始
            </button>
          )}
          <div className="room-code-badge" onClick={handleCopyCode}>
            <span className="room-code-label">房间号</span>
            <span className="room-code-value">{room.code}</span>
            <span className="room-code-copy">
              {copySuccess ? '✓ 已复制' : '📋'}
            </span>
          </div>
          <div className="user-profile">
            <div
              className="member-avatar"
              style={{
                backgroundColor: MEMBER_COLORS[
                  room.members.find((m) => m.id === userId)?.colorIndex || 0
                ],
              }}
              onClick={() => setShowNameInput(!showNameInput)}
            >
              {userName.charAt(0).toUpperCase()}
            </div>
            {showNameInput && (
              <div className="name-input-dropdown">
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="name-input"
                  maxLength={20}
                />
                <button className="btn-small" onClick={handleSaveName}>
                  保存
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="main-content">
        {room.phase === 'search' && <SearchPanel room={room} userId={userId} />}
        {room.phase === 'voting' && <VotingPanel room={room} userId={userId} />}
        {room.phase === 'final' && <FinalItinerary room={room} userId={userId} />}
      </main>
    </div>
  );
};

export default App;

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Role } from '../types';

const LandingPage: React.FC = () => {
  const { createRoom, joinRoom } = useApp();
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [roomName, setRoomName] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [joinRole, setJoinRole] = useState<Role>('student');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim() || !teacherName.trim()) return;
    createRoom(roomName.trim(), teacherName.trim());
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim() || !nickname.trim()) return;
    joinRoom(roomCode.trim(), nickname.trim(), joinRole);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>实时代码编辑监控面板</h1>
        <p style={styles.subtitle}>在线教育编程直播课 · 细粒度代码活动可视化</p>

        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(mode === 'create' ? styles.tabActive : {}) }}
            onClick={() => setMode('create')}
          >
            创建课堂
          </button>
          <button
            style={{ ...styles.tab, ...(mode === 'join' ? styles.tabActive : {}) }}
            onClick={() => setMode('join')}
          >
            加入课堂
          </button>
        </div>

        {mode === 'create' ? (
          <form style={styles.form} onSubmit={handleCreate}>
            <label style={styles.label}>课堂名称</label>
            <input
              style={styles.input}
              placeholder="例如：JavaScript 基础第3讲"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
            />
            <label style={styles.label}>讲师昵称</label>
            <input
              style={styles.input}
              placeholder="请输入您的昵称"
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
            />
            <button style={styles.primaryBtn} type="submit">
              创建房间并生成邀请码
            </button>
          </form>
        ) : (
          <form style={styles.form} onSubmit={handleJoin}>
            <label style={styles.label}>房间码</label>
            <input
              style={styles.input}
              placeholder="6位字母数字混合"
              value={roomCode}
              maxLength={6}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            />
            <label style={styles.label}>昵称</label>
            <input
              style={styles.input}
              placeholder="请输入您的昵称"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
            <div style={styles.roleGroup}>
              <label style={{ ...styles.roleBtn, ...(joinRole === 'student' ? styles.roleActive : {}) }}>
                <input
                  type="radio"
                  name="role"
                  style={{ display: 'none' }}
                  checked={joinRole === 'student'}
                  onChange={() => setJoinRole('student')}
                />
                学生
              </label>
              <label style={{ ...styles.roleBtn, ...(joinRole === 'teacher' ? styles.roleActive : {}) }}>
                <input
                  type="radio"
                  name="role"
                  style={{ display: 'none' }}
                  checked={joinRole === 'teacher'}
                  onChange={() => setJoinRole('teacher')}
                />
                讲师
              </label>
            </div>
            <button style={styles.primaryBtn} type="submit">
              加入房间
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #121212 0%, #1a2a2a 100%)',
    padding: 20,
  },
  card: {
    background: '#1E1E1E',
    borderRadius: 12,
    padding: 40,
    width: '100%',
    maxWidth: 440,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    animation: 'fade-in 0.3s ease-out',
  },
  title: {
    fontSize: 24,
    fontWeight: 600,
    color: '#E0E0E0',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#858585',
    textAlign: 'center',
    marginBottom: 32,
  },
  tabs: {
    display: 'flex',
    gap: 8,
    marginBottom: 28,
    background: '#121212',
    padding: 4,
    borderRadius: 8,
  },
  tab: {
    flex: 1,
    padding: '10px 16px',
    background: 'transparent',
    color: '#858585',
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 500,
    transition: 'all 0.2s',
  },
  tabActive: {
    background: '#4ECDC4',
    color: '#121212',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 13,
    color: '#B0B0B0',
    marginTop: 10,
    marginBottom: 2,
  },
  input: {
    background: '#121212',
    border: '1px solid #333',
    color: '#E0E0E0',
    padding: '12px 14px',
    borderRadius: 8,
    fontSize: 14,
    transition: 'border-color 0.2s',
  },
  primaryBtn: {
    marginTop: 24,
    padding: '14px 20px',
    background: '#4ECDC4',
    color: '#121212',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    transition: 'background 0.2s',
  },
  roleGroup: {
    display: 'flex',
    gap: 8,
    marginTop: 12,
  },
  roleBtn: {
    flex: 1,
    padding: '10px 16px',
    background: '#121212',
    border: '1px solid #333',
    color: '#858585',
    borderRadius: 8,
    fontSize: 14,
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  roleActive: {
    background: 'rgba(78, 205, 196, 0.15)',
    borderColor: '#4ECDC4',
    color: '#4ECDC4',
  },
};

export default LandingPage;

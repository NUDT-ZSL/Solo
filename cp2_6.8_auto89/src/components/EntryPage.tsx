import { useState } from 'react';

interface Props {
  connected: boolean;
  error: string;
  onCreate: (nickname: string) => void;
  onJoin: (roomCode: string, nickname: string) => void;
}

export default function EntryPage({ connected, error, onCreate, onJoin }: Props) {
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [localError, setLocalError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    if (!nickname.trim()) {
      setLocalError('请输入昵称');
      return;
    }
    if (mode === 'create') {
      onCreate(nickname.trim());
    } else {
      if (!roomCode.trim()) {
        setLocalError('请输入房间码');
        return;
      }
      onJoin(roomCode.trim().toUpperCase(), nickname.trim());
    }
  };

  return (
    <div className="entry-page">
      <div className="entry-card">
        <h1 className="entry-title">协作看板</h1>
        <p className="entry-subtitle">轻量实时多人协作任务管理工具</p>

        <div className="entry-tabs">
          <button
            className={`entry-tab ${mode === 'create' ? 'active' : ''}`}
            onClick={() => setMode('create')}
            type="button"
          >
            创建看板
          </button>
          <button
            className={`entry-tab ${mode === 'join' ? 'active' : ''}`}
            onClick={() => setMode('join')}
            type="button"
          >
            加入看板
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'join' && (
            <div className="form-group">
              <label className="form-label">房间码</label>
              <input
                className="form-input"
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="请输入6位房间码"
                maxLength={6}
                style={{ letterSpacing: '2px', textTransform: 'uppercase' }}
              />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">昵称</label>
            <input
              className="form-input"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="请输入你的昵称"
              maxLength={20}
            />
          </div>
          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', marginTop: '8px' }}
            disabled={!connected}
          >
            {!connected ? '连接中...' : mode === 'create' ? '创建并进入' : '加入看板'}
          </button>
          <div className="form-error">{localError || error}</div>
        </form>
      </div>
    </div>
  );
}

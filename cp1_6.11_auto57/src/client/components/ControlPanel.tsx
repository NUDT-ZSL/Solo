import React, { useState } from 'react';
import { Action, Player, PLAYBACK_INTERVAL } from '@shared/types';

interface ControlPanelProps {
  players: Player[];
  selfPlayerId: string | null;
  roomId: string;
  history: Action[];
  playbackIndex: number;
  isPlaying: boolean;
  isPlaybackMode: boolean;
  onRename: (name: string) => void;
  onSave: () => void;
  onShareLink: string | null;
  onPlayPause: () => void;
  onStepForward: () => void;
  onStepBack: () => void;
  onReset: () => void;
  onSeek: (index: number) => void;
  onExitPlayback: () => void;
  onToggleCollapse: () => void;
  isCollapsed: boolean;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  players,
  selfPlayerId,
  roomId,
  history,
  playbackIndex,
  isPlaying,
  isPlaybackMode,
  onRename,
  onSave,
  onShareLink,
  onPlayPause,
  onStepForward,
  onStepBack,
  onReset,
  onSeek,
  onExitPlayback,
  onToggleCollapse,
  isCollapsed,
}) => {
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [copied, setCopied] = useState(false);

  const selfPlayer = players.find((p) => p.id === selfPlayerId);

  const handleCopyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleCopyShareLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(window.location.origin + link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleNameSubmit = () => {
    if (tempName.trim()) {
      onRename(tempName.trim().slice(0, 20));
    }
    setEditingName(false);
  };

  if (isCollapsed) {
    return (
      <button
        className="panel-collapse-btn"
        onClick={onToggleCollapse}
        aria-label="展开控制面板"
      >
        ☰
      </button>
    );
  }

  return (
    <aside className="control-panel">
      <button
        className="panel-close-btn"
        onClick={onToggleCollapse}
        aria-label="折叠控制面板"
      >
        ×
      </button>

      <div className="panel-section">
        <h2 className="panel-title">协作迷宫</h2>
        <div className="room-info">
          <span className="room-label">房间ID:</span>
          <span className="room-id">{roomId}</span>
          <button className="copy-btn" onClick={handleCopyRoomId}>
            {copied ? '✓' : '复制'}
          </button>
        </div>
      </div>

      <div className="panel-section">
        <h3 className="section-title">玩家列表 ({players.length}/8)</h3>
        <div className="player-list">
          {players.map((player) => (
            <div
              key={player.id}
              className={`player-item ${player.id === selfPlayerId ? 'self' : ''}`}
            >
              <div
                className="player-dot"
                style={{ backgroundColor: player.color }}
              />
              {player.id === selfPlayerId && editingName ? (
                <input
                  type="text"
                  className="name-input"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onBlur={handleNameSubmit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleNameSubmit();
                    if (e.key === 'Escape') setEditingName(false);
                  }}
                  autoFocus
                  maxLength={20}
                />
              ) : (
                <span
                  className="player-name"
                  onDoubleClick={() => {
                    if (player.id === selfPlayerId) {
                      setTempName(player.name);
                      setEditingName(true);
                    }
                  }}
                  title={player.id === selfPlayerId ? '双击修改名称' : ''}
                >
                  {player.name}
                  {player.id === selfPlayerId && ' (我)'}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="panel-section">
        <h3 className="section-title">历史回放</h3>
        <div className="playback-info">
          步骤: {playbackIndex} / {history.length}
        </div>
        <input
          type="range"
          className="playback-slider"
          min={0}
          max={history.length}
          value={playbackIndex}
          onChange={(e) => onSeek(parseInt(e.target.value, 10))}
          disabled={history.length === 0}
        />
        <div className="playback-controls">
          <button
            className="ctrl-btn"
            onClick={onStepBack}
            disabled={playbackIndex === 0 || !isPlaybackMode && history.length === 0}
            title="上一步"
          >
            ⏮
          </button>
          <button
            className="ctrl-btn play-btn"
            onClick={onPlayPause}
            disabled={history.length === 0}
            title={isPlaying ? '暂停' : '播放'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button
            className="ctrl-btn"
            onClick={onStepForward}
            disabled={
              playbackIndex >= history.length ||
              (!isPlaybackMode && history.length === 0)
            }
            title="下一步"
          >
            ⏭
          </button>
          <button
            className="ctrl-btn"
            onClick={onReset}
            disabled={history.length === 0}
            title="重置到开始"
          >
            ⏹
          </button>
          {isPlaybackMode && (
            <button className="ctrl-btn exit-btn" onClick={onExitPlayback}>
              退出回放
            </button>
          )}
        </div>
        <div className="playback-speed">
          速度: {(1000 / PLAYBACK_INTERVAL).toFixed(1)}x
        </div>
      </div>

      <div className="panel-section">
        <h3 className="section-title">分享与保存</h3>
        <button className="action-btn save-btn" onClick={onSave}>
          💾 保存迷宫
        </button>
        {onShareLink && (
          <div className="share-link">
            <input
              type="text"
              readOnly
              className="share-input"
              value={window.location.origin + onShareLink}
            />
            <button
              className="copy-btn share-copy-btn"
              onClick={() => handleCopyShareLink(onShareLink)}
            >
              {copied ? '已复制' : '复制'}
            </button>
          </div>
        )}
      </div>

      <div className="panel-section help-section">
        <h3 className="section-title">操作说明</h3>
        <ul className="help-list">
          <li>点击空格：放置/移除障碍物</li>
          <li>拖拽自己：在网格中移动</li>
          <li>右键/Shift+点击：放置提示</li>
          <li>双击自己的名字：修改昵称</li>
        </ul>
      </div>
    </aside>
  );
};

export default ControlPanel;

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { HistoryAction, Note } from '../types';

interface HistoryPlayerProps {
  history: HistoryAction[];
  originalNotes: Note[];
  onApplyHistoryState: (notes: Note[]) => void;
  onExitPlayback: () => void;
}

const HistoryPlayer: React.FC<HistoryPlayerProps> = ({
  history,
  originalNotes,
  onApplyHistoryState,
  onExitPlayback
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sortedHistoryRef = useRef<HistoryAction[]>([]);

  useEffect(() => {
    sortedHistoryRef.current = [...history].sort((a, b) => a.timestamp - b.timestamp);
  }, [history]);

  const sortedHistory = sortedHistoryRef.current;
  const totalActions = sortedHistory.length;

  const reconstructStateUpTo = useCallback((index: number): Note[] => {
    const stateMap = new Map<string, Note>();

    for (let i = 0; i <= index && i < sortedHistory.length; i++) {
      const action = sortedHistory[i];
      switch (action.type) {
        case 'create':
          if (action.note) {
            stateMap.set(action.noteId, { ...action.note });
          }
          break;
        case 'move':
          const existingNote = stateMap.get(action.noteId);
          if (existingNote) {
            stateMap.set(action.noteId, {
              ...existingNote,
              x: action.newX ?? existingNote.x,
              y: action.newY ?? existingNote.y,
              status: action.newStatus ?? existingNote.status
            });
          }
          break;
        case 'update':
          if (action.note) {
            stateMap.set(action.noteId, { ...action.note });
          }
          break;
        case 'delete':
          stateMap.delete(action.noteId);
          break;
      }
    }

    return Array.from(stateMap.values());
  }, [sortedHistory]);

  const applyState = useCallback((index: number) => {
    const state = reconstructStateUpTo(index);
    onApplyHistoryState(state);
    setCurrentIndex(index);
    setProgress(totalActions > 0 ? ((index + 1) / totalActions) * 100 : 0);
  }, [reconstructStateUpTo, onApplyHistoryState, totalActions]);

  const playNext = useCallback(() => {
    if (currentIndex >= totalActions - 1) {
      setIsPlaying(false);
      return;
    }
    const nextIndex = currentIndex + 1;
    applyState(nextIndex);

    const interval = 5000 / speed;
    timerRef.current = setTimeout(() => {
      setCurrentIndex(idx => {
        playNextInternal(idx + 1);
        return idx + 1;
      });
    }, interval);
  }, [currentIndex, totalActions, speed, applyState]);

  const playNextInternal = useCallback((index: number) => {
    if (index >= totalActions - 1) {
      setIsPlaying(false);
      applyState(totalActions - 1);
      return;
    }
    applyState(index);
    const interval = 5000 / speed;
    timerRef.current = setTimeout(() => playNextInternal(index + 1), interval);
  }, [totalActions, speed, applyState]);

  useEffect(() => {
    if (isPlaying) {
      const startIndex = currentIndex < totalActions - 1 ? currentIndex + 1 : 0;
      if (startIndex === 0) applyState(0);
      const interval = startIndex === 0 ? 0 : 5000 / speed;
      timerRef.current = setTimeout(() => {
        playNextInternal(startIndex === 0 ? 1 : startIndex);
      }, interval);
    } else if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isPlaying]);

  useEffect(() => {
    if (totalActions === 0) {
      onApplyHistoryState([]);
    } else {
      applyState(0);
    }
    return () => {
      onApplyHistoryState(originalNotes);
    };
  }, [totalActions]);

  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSkipBack = () => {
    setIsPlaying(false);
    const newIndex = Math.max(0, currentIndex - 1);
    applyState(newIndex);
  };

  const handleSkipForward = () => {
    setIsPlaying(false);
    const newIndex = Math.min(totalActions - 1, currentIndex + 1);
    applyState(newIndex);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsPlaying(false);
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const targetIndex = Math.min(totalActions - 1, Math.max(0, Math.floor(percentage * totalActions)));
    applyState(targetIndex);
  };

  const handleThumbDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsPlaying(false);
    const bar = e.currentTarget.parentElement as HTMLDivElement;
    const rect = bar.getBoundingClientRect();
    const startX = e.clientX;
    const startProgress = progress;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = (moveEvent.clientX - startX) / rect.width;
      const newPercentage = Math.min(100, Math.max(0, startProgress + delta * 100));
      const targetIndex = Math.min(totalActions - 1, Math.max(0, Math.floor((newPercentage / 100) * totalActions)));
      applyState(targetIndex);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const formatActionLabel = (index: number) => {
    if (totalActions === 0) return '暂无历史记录';
    const action = sortedHistory[index];
    if (!action) return '';
    const labels: Record<string, string> = {
      create: '创建便签',
      move: '移动便签',
      update: '更新便签',
      delete: '删除便签'
    };
    return labels[action.type] || action.type;
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  };

  const getStartTime = () => sortedHistory[0]?.timestamp || Date.now();
  const getCurrentTime = () => sortedHistory[currentIndex]?.timestamp || getStartTime();
  const getEndTime = () => sortedHistory[totalActions - 1]?.timestamp || getStartTime();

  return (
    <div className="history-player">
      <div className="history-player-header">
        <div className="history-player-title">
          <span>⏪</span>
          <span>历史回放 - {formatActionLabel(currentIndex)}</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginLeft: 8 }}>
            第 {currentIndex + 1} / {totalActions} 条操作
          </span>
        </div>
        <button className="history-player-close" onClick={onExitPlayback} title="退出回放">✕</button>
      </div>

      <div className="history-progress-container">
        <div className="progress-bar" onClick={handleProgressClick}>
          <div className="progress-fill" style={{ width: `${progress}%` }} />
          <div
            className="progress-thumb"
            style={{ left: `${progress}%` }}
            onMouseDown={handleThumbDrag}
          />
        </div>
        <div className="history-time-display">
          <span>{formatTime(getStartTime())}</span>
          <span>{formatTime(getCurrentTime())}</span>
          <span>{formatTime(getEndTime())}</span>
        </div>
      </div>

      <div className="history-controls">
        <button className="history-control-btn" onClick={handleSkipBack} title="上一步">⏮</button>
        <button className="history-control-btn play" onClick={handleTogglePlay} title={isPlaying ? '暂停' : '播放'}>
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button className="history-control-btn" onClick={handleSkipForward} title="下一步">⏭</button>
        <select
          className="speed-select"
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
        >
          <option value={0.5}>0.5x</option>
          <option value={1}>1x</option>
          <option value={2}>2x</option>
          <option value={4}>4x</option>
        </select>
      </div>
    </div>
  );
};

export default HistoryPlayer;

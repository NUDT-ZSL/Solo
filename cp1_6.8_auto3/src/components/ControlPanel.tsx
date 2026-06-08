import { useState } from 'react';
import { PenLine, RefreshCw, Trees, Waves } from 'lucide-react';
import { useOceanStore } from '@/store/oceanStore';
import { useNavigate } from 'react-router-dom';

interface ControlPanelProps {
  bubbleCount: number;
  onRefresh: () => void;
}

export default function ControlPanel({ bubbleCount, onRefresh }: ControlPanelProps) {
  const setWriteModalOpen = useOceanStore((s) => s.setWriteModalOpen);
  const navigate = useNavigate();

  return (
    <div className="control-panel">
      <button
        className="control-btn"
        onClick={() => setWriteModalOpen(true)}
        title="写诗"
      >
        <PenLine size={18} />
        <span className="btn-text">写诗</span>
      </button>

      <button
        className="control-btn"
        onClick={onRefresh}
        title="刷新海洋"
      >
        <RefreshCw size={18} />
        <span className="btn-text">刷新</span>
      </button>

      <div className="bubble-count">
        <Waves size={14} />
        <span>{bubbleCount}</span>
      </div>

      <button
        className="control-btn island-btn"
        onClick={() => navigate('/island')}
        title="我的小岛"
      >
        <Trees size={18} />
        <span className="btn-text">小岛</span>
      </button>
    </div>
  );
}

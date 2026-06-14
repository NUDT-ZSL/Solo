import { useEffect, useState } from 'react';
import type { Bridge } from '../Bridge';
import type { UIState } from '../types';

interface StatusBarProps {
  bridge: Bridge;
}

export function StatusBar({ bridge }: StatusBarProps) {
  const [state, setState] = useState<UIState | null>(null);

  useEffect(() => {
    const unsubscribe = bridge.subscribe((s) => setState(s));
    return unsubscribe;
  }, [bridge]);

  if (!state) return null;

  return (
    <div className="status-bar">
      <div className="tick-display">
      Tick: {state.tick.toFixed(1)}s</div>
      <button
        className="pause-btn"
        onClick={() => bridge.togglePause()}
      >
        {state.isPaused ? '▶ 继续' : '⏸ 暂停'}
      </button>
    </div>
  );
}

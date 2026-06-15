import { useEffect, useState } from 'react';
import type { SimulateResponse, ReplayRecord } from '../utils/types';
import { formatTime } from '../utils/simulator';

interface StatsPanelProps {
  simulateResult: SimulateResponse | null;
  replayHistory: ReplayRecord[];
  onReplay: (record: ReplayRecord) => void;
  isMobile: boolean;
  panelOpen: boolean;
  onTogglePanel: () => void;
}

function AnimatedNumber({ value, duration = 300 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const start = display;
    const end = value;
    const startTime = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(start + (end - start) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, display]);

  return <>{display}</>;
}

function ProgressRing({ percent }: { percent: number }) {
  const size = 160;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const [offset, setOffset] = useState(circumference);

  useEffect(() => {
    const target = circumference - (percent / 100) * circumference;
    const start = performance.now();
    let raf = 0;
    const animate = (now: number) => {
      const t = Math.min(1, (now - start) / 300);
      const eased = 1 - Math.pow(1 - t, 3);
      const currentOffset = circumference - (percent / 100) * circumference * eased;
      setOffset(currentOffset);
      if (t < 1) raf = requestAnimationFrame(animate);
      else setOffset(target);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [percent, circumference, radius]);

  return (
    <div className="progress-ring-container">
      <svg className="progress-ring" width={size} height={size}>
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#42A5F5" />
            <stop offset="100%" stopColor="#AB47BC" />
          </linearGradient>
        </defs>
        <circle
          className="progress-ring-bg"
          cx={size / 2}
          cy={size / 2}
          r={radius}
        />
        <circle
          className="progress-ring-fg"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="progress-text">
        <span className="progress-percent">
          <AnimatedNumber value={percent} />%
        </span>
        <span className="progress-label">覆盖率</span>
      </div>
    </div>
  );
}

export default function StatsPanel(props: StatsPanelProps) {
  const { simulateResult, replayHistory, onReplay, isMobile, panelOpen, onTogglePanel } = props;

  const total = simulateResult?.totalBranches ?? 0;
  const triggered = simulateResult?.triggeredBranches ?? 0;
  const untriggered = simulateResult?.untriggeredBranches ?? 0;
  const coverage = simulateResult?.coveragePercent ?? 0;

  const content = (
    <>
      <div className="panel-section">
        <span className="panel-title">分支统计</span>
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-label">总分支</span>
            <span className="stat-value total">
              <AnimatedNumber value={total} />
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-label">已触发</span>
            <span className="stat-value triggered">
              <AnimatedNumber value={triggered} />
            </span>
          </div>
          <div className="stat-card" style={{ gridColumn: '1 / -1' }}>
            <span className="stat-label">未触发</span>
            <span className="stat-value untriggered">
              <AnimatedNumber value={untriggered} />
            </span>
          </div>
        </div>
      </div>

      <div className="panel-section">
        <span className="panel-title">覆盖率</span>
        <ProgressRing percent={coverage} />
      </div>

      <div className="panel-section">
        <span className="panel-title">路径回放（最近5次）</span>
        {replayHistory.length === 0 ? (
          <div className="empty-state">暂无模拟记录，点击"运行模拟"开始</div>
        ) : (
          <div className="replay-list">
            {replayHistory.map((record) => (
              <div
                key={record.id}
                className="replay-item"
                onClick={() => onReplay(record)}
              >
                <div className="replay-item-summary">{record.summary}</div>
                <div className="replay-item-time">
                  {formatTime(record.timestamp)} · 覆盖率 {record.result.coveragePercent}%
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );

  if (isMobile) {
    return (
      <>
        {panelOpen && <div className="drawer-backdrop" onClick={onTogglePanel} />}
        <div className={`stats-panel ${panelOpen ? 'drawer-open' : 'drawer-closed'}`}>
          {content}
        </div>
        <button className="drawer-toggle" onClick={onTogglePanel} title="统计面板">
          {panelOpen ? '×' : '☰'}
        </button>
      </>
    );
  }

  return <div className="stats-panel">{content}</div>;
}

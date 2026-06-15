import React, { useState } from 'react';
import { RadarScore } from './RadarScore';
import { SummaryReport } from './SummaryReport';
import { BarChart2, ClipboardList } from 'lucide-react';
import { ScoreResult, CommonError, WordStat, ScoreHistoryItem } from '../types';

interface ScorePanelProps {
  currentScore: ScoreResult | null;
  errors: CommonError[];
  wordStats: WordStat[];
  scoreHistory: ScoreHistoryItem[];
}

type TabType = 'score' | 'report';

export const ScorePanel: React.FC<ScorePanelProps> = ({
  currentScore,
  errors,
  wordStats,
  scoreHistory
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('score');

  return (
    <div className="card" style={{
      height: 'calc(100vh - 180px)',
      minHeight: '600px',
      display: 'flex',
      flexDirection: 'column',
      padding: 0,
      overflow: 'hidden'
    }}>
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid #E2E8F0',
        display: 'flex',
        gap: '8px'
      }}>
        <TabButton
          active={activeTab === 'score'}
          onClick={() => setActiveTab('score')}
          icon={<BarChart2 size={16} />}
          label="评分详情"
        />
        <TabButton
          active={activeTab === 'report'}
          onClick={() => setActiveTab('report')}
          icon={<ClipboardList size={16} />}
          label="总结报告"
        />
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px 24px'
      }}>
        {activeTab === 'score' ? (
          <RadarScore score={currentScore} />
        ) : (
          <SummaryReport
            errors={errors}
            wordStats={wordStats}
            scoreHistory={scoreHistory}
          />
        )}
      </div>
    </div>
  );
};

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

const TabButton: React.FC<TabButtonProps> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    style={{
      flex: 1,
    padding: '10px 16px',
    borderRadius: '12px',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    fontSize: '0.85rem',
    fontWeight: 600,
    transition: 'all 0.2s ease',
    background: active
      ? 'linear-gradient(135deg, #3B82F6, #2563EB)'
    : '#F1F5F9',
    color: active ? '#FFFFFF' : '#64748B',
    boxShadow: active ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none'
  }}
    onMouseEnter={(e) => {
      if (!active) {
        e.currentTarget.style.background = '#E2E8F0';
      }
    }}
    onMouseLeave={(e) => {
      if (!active) {
        e.currentTarget.style.background = '#F1F5F9';
      }
    }}
  >
    {icon}
    {label}
  </button>
);

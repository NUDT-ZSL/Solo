import React from 'react';
import { useGoStore } from './store';
import { X, TrendingUp, TrendingDown, Target } from 'lucide-react';
import type { Move } from './GameEngine';

const coordLabels = 'ABCDEFGHJKLMNOPQRST';

function coordToLabel(x: number, y: number): string {
  return `${coordLabels[x]}${19 - y}`;
}

interface MoveDetailsProps {
  move: Move;
  onClose: () => void;
}

const MoveDetails: React.FC<MoveDetailsProps> = ({ move, onClose }) => {
  const winRateDiff = move.winRate - move.prevWinRate;
  const isWinRateUp = winRateDiff > 0;
  const winRatePct = (move.winRate * 100).toFixed(1);
  const prevWinRatePct = (move.prevWinRate * 100).toFixed(1);
  const diffPct = (Math.abs(winRateDiff) * 100).toFixed(1);
  const scoreLeadPct = move.scoreLead.toFixed(1);

  return (
    <div className="move-details-overlay" onClick={onClose}>
      <div className="move-details-card" onClick={e => e.stopPropagation()}>
        <button className="details-close" onClick={onClose}>
          <X size={18} />
        </button>

        <div className="details-header">
          <div className={`stone-indicator ${move.color}`} />
          <div>
            <div className="details-title">
              第 {move.moveNumber} 手 · {move.color === 'black' ? '黑' : '白'} · {coordToLabel(move.x, move.y)}
            </div>
            {move.isKeyMoment && (
              <div className="key-moment-badge">关键转折</div>
            )}
          </div>
        </div>

        <div className="details-stats">
          <div className="stat-row">
            <span className="stat-label">胜率</span>
            <div className="stat-value-group">
              <span className="stat-prev">{prevWinRatePct}%</span>
              <span className="stat-arrow">
                {isWinRateUp ? (
                  <TrendingUp size={16} className="text-red-500" />
                ) : (
                  <TrendingDown size={16} className="text-blue-500" />
                )}
              </span>
              <span className={`stat-current ${isWinRateUp ? 'text-red-500' : 'text-blue-500'}`}>
                {winRatePct}%
              </span>
              <span className={`stat-diff ${isWinRateUp ? 'text-red-500' : 'text-blue-500'}`}>
                ({isWinRateUp ? '+' : '-'}{diffPct}%)
              </span>
            </div>
          </div>

          <div className="stat-row">
            <span className="stat-label">目数差</span>
            <span className="stat-value">{scoreLeadPct} 目</span>
          </div>
        </div>

        <div className="details-suggestions">
          <div className="suggestions-title">
            <Target size={14} />
            AI 推荐位置
          </div>
          {move.suggestions.length === 0 ? (
            <div className="no-suggestions">暂无推荐</div>
          ) : (
            <div className="suggestion-list">
              {move.suggestions.map((sug, i) => (
                <div key={i} className="suggestion-item">
                  <span className="sug-rank">{i + 1}</span>
                  <span className="sug-coord">{coordToLabel(sug.x, sug.y)}</span>
                  <span className="sug-winrate">{(sug.winRate * 100).toFixed(1)}%</span>
                  <span className="sug-score">{sug.scoreLead > 0 ? '+' : ''}{sug.scoreLead.toFixed(1)}目</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {move.comment && (
          <div className="details-comment">
            {move.comment}
          </div>
        )}
      </div>
    </div>
  );
};

const MoveDetailsContainer: React.FC = () => {
  const selectedMove = useGoStore(s => s.selectedMove);
  const selectMove = useGoStore(s => s.selectMove);

  if (!selectedMove) return null;

  return <MoveDetails move={selectedMove} onClose={() => selectMove(null)} />;
};

export default MoveDetailsContainer;

import React from 'react';
import { useRaceStore } from '../store/useRaceStore';
import { LANGUAGE_COLORS, MEDAL_COLORS } from '../types';

const ResultTable: React.FC = () => {
  const { results, isFadingOut } = useRaceStore();

  if (results.length === 0) {
    return (
      <div className="result-panel">
        <div className="panel-heading">比 赛 结 果</div>
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <div className="empty-text">暂无数据</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`result-panel ${isFadingOut ? 'fade-out' : ''}`}>
      <div className="panel-heading">比 赛 结 果</div>
      <table className="result-table">
        <thead>
          <tr>
            <th>排名</th>
            <th>语言</th>
            <th>耗时</th>
            <th>差距</th>
          </tr>
        </thead>
        <tbody>
          {results.map((result) => (
            <tr key={result.language} className={`rank-${result.rank}`}>
              <td>
                <span
                  className="rank-badge"
                  style={{
                    background: MEDAL_COLORS[result.rank] || 'rgba(255,255,255,0.1)',
                    color: result.rank <= 3 ? '#0B0C10' : '#A0AEC0'
                  }}
                >
                  {result.rank}
                </span>
              </td>
              <td>
                <span className="lang-cell">
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: LANGUAGE_COLORS[result.language],
                      display: 'inline-block'
                    }}
                  />
                  {result.language}
                </span>
              </td>
              <td className="elapsed-cell">{result.elapsedMs}ms</td>
              <td className={`gap-cell ${result.gapPercent === 0 ? 'zero' : 'positive'}`}>
                {result.gapPercent === 0 ? '— 最快' : `+${result.gapPercent}%`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ResultTable;

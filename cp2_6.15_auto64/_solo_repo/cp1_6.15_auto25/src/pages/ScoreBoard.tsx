import { useState, useEffect, useMemo } from 'react';
import { getScores, sortScores, SortField, SortOrder, ScoreRecord } from '../storage/ScoreStore';

interface ScoreBoardProps {
  onBack: () => void;
}

export default function ScoreBoard({ onBack }: ScoreBoardProps) {
  const [records, setRecords] = useState<ScoreRecord[]>([]);
  const [sortField, setSortField] = useState<SortField>('score');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const data = getScores();
    setRecords(data);
    const timer = setTimeout(() => setLoaded(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const sorted = useMemo(() => {
    return sortScores(records, sortField, sortOrder);
  }, [records, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const getArrow = (field: SortField) => {
    if (sortField !== field) return '';
    return sortOrder === 'asc' ? ' ▲' : ' ▼';
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}分${s}秒`;
  };

  return (
    <div className="scoreboard-container">
      <h2>历史战绩</h2>
      {sorted.length === 0 ? (
        <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: 20 }}>暂无战绩记录</p>
      ) : (
        <div className="score-table-wrapper">
          <table className="score-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('nickname')}>
                  昵称<span className="sort-arrow">{getArrow('nickname')}</span>
                </th>
                <th onClick={() => handleSort('score')}>
                  得分<span className="sort-arrow">{getArrow('score')}</span>
                </th>
                <th onClick={() => handleSort('duration')}>
                  时长<span className="sort-arrow">{getArrow('duration')}</span>
                </th>
                <th onClick={() => handleSort('kills')}>
                  击杀数<span className="sort-arrow">{getArrow('kills')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, idx) => (
                <tr
                  key={r.id}
                  className={loaded ? 'row-animate' : ''}
                  style={loaded ? { animationDelay: `${idx * 0.05}s` } : {}}
                >
                  <td>{r.nickname}</td>
                  <td>{r.score}</td>
                  <td>{formatDuration(r.duration)}</td>
                  <td>{r.kills}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <button className="back-btn" onClick={onBack}>
        返回主菜单
      </button>
    </div>
  );
}

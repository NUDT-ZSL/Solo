import React from 'react';

interface HistoryItem {
  id: string;
  ra: number;
  dec: number;
  mixRatio: { [key: string]: number };
}

interface HistoryTagsProps {
  history: HistoryItem[];
  onRestore: (item: HistoryItem) => void;
}

const HistoryTags: React.FC<HistoryTagsProps> = ({ history, onRestore }) => {
  const formatRA = (value: number) => {
    const h = Math.floor(value);
    const m = Math.floor((value - h) * 60);
    return `${h}h${m}m`;
  };

  const formatDec = (value: number) => {
    const sign = value >= 0 ? '+' : '-';
    const abs = Math.abs(value);
    const d = Math.floor(abs);
    return `${sign}${d}°`;
  };

  const formatMixRatio = (mixRatio: { [key: string]: number }) => {
    return Object.entries(mixRatio)
      .map(([band, ratio]) => `${band}:${Math.round(ratio * 100)}%`)
      .join(' ');
  };

  if (history.length === 0) {
    return <div className="history-empty">暂无历史记录</div>;
  }

  return (
    <div className="history-tags">
      {history.map((item) => (
        <button
          key={item.id}
          className="history-tag"
          onClick={() => onRestore(item)}
        >
          <span className="history-tag-coord">
            {formatRA(item.ra)} {formatDec(item.dec)}
          </span>
          <span className="history-tag-ratio">
            {formatMixRatio(item.mixRatio)}
          </span>
        </button>
      ))}
    </div>
  );
};

export default HistoryTags;

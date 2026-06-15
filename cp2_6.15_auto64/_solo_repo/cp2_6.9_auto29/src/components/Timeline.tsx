import React from 'react';
import type { TimeOption } from '../types';
import { getDayOfWeek, sortByDate } from '../utils';

interface Props {
  options: TimeOption[];
  selectedIds: string[];
  recommendedId?: string;
  onToggle: (optionId: string) => void;
  selectable: boolean;
}

const Timeline: React.FC<Props> = ({ options, selectedIds, recommendedId, onToggle, selectable }) => {
  const sortedOptions = sortByDate(options);

  const handleClick = (optId: string) => {
    if (selectable) {
      onToggle(optId);
    }
  };

  return (
    <div className="timeline">
      {sortedOptions.map((opt) => {
        const isSelected = selectedIds.includes(opt.id);
        const isRecommended = opt.id === recommendedId;
        let className = 'timeline-item';
        if (isSelected) className += ' selected';
        else if (isRecommended) className += ' recommended';

        return (
          <div key={opt.id} className={className} onClick={() => handleClick(opt.id)}>
            <div className="timeline-header">
              <div>
                <span className="timeline-name">{opt.name}</span>
                {isRecommended && <span className="recommended-badge">推荐</span>}
              </div>
              <span className="timeline-time">
                {opt.date} (周{getDayOfWeek(opt.date)}) {opt.startTime}-{opt.endTime}
              </span>
            </div>
            <div className="timeline-votes">
              <span>{selectable ? (isSelected ? '✓ 已选择' : '点击选择') : ''}</span>
              <span className="vote-count">{opt.votes} 票</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Timeline;

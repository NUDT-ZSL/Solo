import React from 'react';
import type { TimeOption } from '../types';
import { getDayClass, getDayOfWeek, getMaxVotes } from '../utils';

interface Props {
  options: TimeOption[];
}

const VoteChart: React.FC<Props> = ({ options }) => {
  const maxVotes = getMaxVotes(options);

  return (
    <div className="chart-bars">
      {options.slice(0, 4).map((opt) => {
        const percentage = maxVotes > 0 ? (opt.votes / maxVotes) * 100 : 0;
        return (
          <div key={opt.id} className="chart-row">
            <span className="chart-label">周{getDayOfWeek(opt.date)}</span>
            <div className="chart-bar-container">
              <div
                className={`chart-bar ${getDayClass(opt.date)}`}
                style={{ width: `${Math.max(percentage, 5)}%` }}
              />
            </div>
            <span className="chart-value">{opt.votes}</span>
          </div>
        );
      })}
    </div>
  );
};

export default VoteChart;

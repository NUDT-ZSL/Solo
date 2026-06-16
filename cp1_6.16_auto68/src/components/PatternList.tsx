import React from 'react';
import { PatternCard } from './PatternCard';
import type { Pattern } from '../types';

interface PatternListProps {
  patterns: Pattern[];
  onSelect: (pattern: Pattern) => void;
}

export const PatternList: React.FC<PatternListProps> = ({ patterns, onSelect }) => {
  return (
    <div className="pattern-masonry fade-in">
      {patterns.map((pattern) => (
        <PatternCard
          key={pattern.id}
          pattern={pattern}
          onClick={() => onSelect(pattern)}
        />
      ))}
      {patterns.length === 0 && (
        <div className="empty-state wide">
          <p>暂无图纸数据</p>
        </div>
      )}
    </div>
  );
};

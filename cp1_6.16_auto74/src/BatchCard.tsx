import React from 'react';
import type { Batch } from './types';

const ORIGIN_COLORS: Record<string, string> = {
  '埃塞俄比亚': '#E6C229',
  '埃塞': '#E6C229',
  'Ethiopia': '#E6C229',
  '哥伦比亚': '#6B4226',
  'Colombia': '#6B4226',
  '巴西': '#4CAF50',
  'Brazil': '#4CAF50',
};

function getOriginColor(origin: string): string {
  if (ORIGIN_COLORS[origin]) return ORIGIN_COLORS[origin];
  for (const key of Object.keys(ORIGIN_COLORS)) {
    if (origin.includes(key)) return ORIGIN_COLORS[key];
  }
  return '#2C3E50';
}

interface BatchCardProps {
  batch: Batch;
  selected: boolean;
  onSelect: () => void;
}

export function BatchCard({ batch, selected, onSelect }: BatchCardProps) {
  const bgColor = getOriginColor(batch.origin);
  const isLowWeight = batch.weight < 5;

  return (
    <div
      className={`batch-card ${selected ? 'batch-card-selected' : ''}`}
      style={{ background: bgColor }}
      onClick={onSelect}
    >
      {isLowWeight && (
        <div className="low-weight-warning">
          ⚠ 低库存
        </div>
      )}
      <div className="batch-card-body">
        <h3 className="batch-origin">{batch.origin}</h3>
        <p className="batch-info">庄园：{batch.farm}</p>
        <p className="batch-info">处理法：{batch.process}</p>
        <p className="batch-info">海拔：{batch.altitude}</p>
        <p className="batch-info weight">库存：{batch.weight} kg</p>
        <p className="batch-info date">采购：{batch.purchaseDate}</p>
      </div>
    </div>
  );
}

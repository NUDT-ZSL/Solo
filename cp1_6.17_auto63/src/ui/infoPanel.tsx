import React from 'react';
import { useStarStore } from '@/store/useStarStore';
import { STAGE_NAMES } from '@/core/types';
import { formatAge, formatNumber } from '@/data/starData';

export const InfoPanel: React.FC = () => {
  const { starParams } = useStarStore();

  return (
    <div className="info-panel">
      <h3>恒星参数</h3>
      
      <div className="param-row">
        <span className="param-label">当前阶段</span>
        <span className="stage-badge">
          {STAGE_NAMES[starParams.stage]}
        </span>
      </div>

      <div className="param-row">
        <span className="param-label">质量</span>
        <span className="param-value">{starParams.mass} M☉</span>
      </div>

      <div className="param-row">
        <span className="param-label">半径</span>
        <span className="param-value">{formatNumber(starParams.radius)} R☉</span>
      </div>

      <div className="param-row">
        <span className="param-label">表面温度</span>
        <span className="param-value">{Math.round(starParams.temperature).toLocaleString()} K</span>
      </div>

      <div className="param-row">
        <span className="param-label">光度</span>
        <span className="param-value">{formatNumber(starParams.luminosity)} L☉</span>
      </div>

      <div className="param-row">
        <span className="param-label">已演化时间</span>
        <span className="param-value">{formatAge(starParams.age)}</span>
      </div>
    </div>
  );
};

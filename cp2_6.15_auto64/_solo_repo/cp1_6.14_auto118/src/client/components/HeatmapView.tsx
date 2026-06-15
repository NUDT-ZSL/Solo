import { useState, useEffect } from 'react';
import useStore from '../store';
import type { HeatmapData } from '../types';
import { LANGUAGE_COLORS } from '../types';

export default function HeatmapView() {
  const heatmapData = useStore((s) => s.heatmapData);
  const fetchHeatmap = useStore((s) => s.fetchHeatmap);
  const [hoveredLang, setHoveredLang] = useState<string | null>(null);

  useEffect(() => {
    fetchHeatmap();
  }, [fetchHeatmap]);

  const maxComments = Math.max(...heatmapData.map((d) => d.commentCount), 1);

  const getColor = (count: number): string => {
    const ratio = count / maxComments;
    const cold = { r: 190, g: 227, b: 248 };
    const hot = { r: 229, g: 62, b: 62 };
    const r = Math.round(cold.r + (hot.r - cold.r) * ratio);
    const g = Math.round(cold.g + (hot.g - cold.g) * ratio);
    const b = Math.round(cold.b + (hot.b - cold.b) * ratio);
    return `rgb(${r}, ${g}, ${b})`;
  };

  return (
    <div className="heatmap-container">
      <h1 className="heatmap-title">评论热度分析</h1>
      <p className="heatmap-subtitle">
        按编程语言统计代码片段的评论密集程度，颜色越深代表讨论越热烈
      </p>
      <div className="heatmap-grid">
        {heatmapData.map((item: HeatmapData) => (
          <div
            key={item.language}
            className="heatmap-cell"
            style={{ backgroundColor: getColor(item.commentCount) }}
            onMouseEnter={() => setHoveredLang(item.language)}
            onMouseLeave={() => setHoveredLang(null)}
          >
            {hoveredLang === item.language && (
              <div className="heatmap-tooltip">
                {item.language}：{item.commentCount} 条评论 / {item.snippetCount} 个片段
              </div>
            )}
            <span className="heatmap-cell-lang">{item.language.slice(0, 4)}</span>
            <span className="heatmap-cell-count">{item.commentCount}</span>
          </div>
        ))}
      </div>
      <div className="heatmap-legend">
        <span>低热度</span>
        <div className="heatmap-legend-bar" />
        <span>高热度</span>
      </div>
    </div>
  );
}

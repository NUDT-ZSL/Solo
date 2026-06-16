import { useMemo } from 'react';
import { CityData } from './data';
import { useSlideAnimation } from './hooks/useSlideAnimation';

interface CityPanelProps {
  city: CityData | null;
}

const MAX_STAGGER_DURATION = 1000;

const CityPanel = ({ city }: CityPanelProps) => {
  const { displayValue: displayCity, phase, enterDuration } = useSlideAnimation(city);

  const cardDelays = useMemo(() => {
    if (!displayCity) return [];
    const count = displayCity.records.length;
    if (count <= 1) return [0];
    const step = Math.min(MAX_STAGGER_DURATION / count, 100);
    return displayCity.records.map((_, i) => i * step);
  }, [displayCity]);

  const panelClass = useMemo(() => {
    const classes = ['city-panel'];
    if (phase === 'leaving') classes.push('panel-leaving');
    if (phase === 'entering') classes.push('panel-entering');
    return classes.join(' ');
  }, [phase]);

  if (!displayCity) {
    return (
      <div className={panelClass} style={{ animationDuration: `${enterDuration}ms` }}>
        <div className="panel-empty">
          点击时间线上的城市节点，
          <br />
          查看旅行记录详情
        </div>
      </div>
    );
  }

  return (
    <div className={panelClass} style={{ animationDuration: `${enterDuration}ms` }}>
      <div className="panel-header">
        <div className="panel-city-name">{displayCity.name}</div>
        <div className="panel-city-meta">
          {displayCity.year}年{displayCity.month}月 · {displayCity.records.length} 条记录 · 坐标{' '}
          {displayCity.lat.toFixed(2)}, {displayCity.lng.toFixed(2)}
        </div>
      </div>

      <div>
        {displayCity.records.map((record, index) => (
          <div
            key={record.id}
            className="record-card"
            style={{
              animationDelay: `${cardDelays[index] || 0}ms`,
              animationDuration: `${Math.min(400, MAX_STAGGER_DURATION - (cardDelays[index] || 0))}ms`,
            }}
          >
            <div className="record-photo">Photo</div>
            <div className="record-date">{record.date}</div>
            <div className="record-title">{record.title}</div>
            <div className="record-thoughts">{record.thoughts}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CityPanel;

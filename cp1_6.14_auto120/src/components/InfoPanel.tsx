import React from 'react';
import { ProcessedStationData } from '../DataProcessor';
import { POLLUTANT_COLORS, POLLUTANT_LABELS, PollutantData } from '../data/mockData';

interface InfoPanelProps {
  station: ProcessedStationData | null;
  onClose: () => void;
}

export const InfoPanel: React.FC<InfoPanelProps> = ({ station, onClose }) => {
  if (!station) return null;

  const pollutantKeys: (keyof PollutantData)[] = ['pm25', 'pm10', 'o3', 'no2'];

  const pm25Level = station.pollutants.pm25;
  const o3Level = station.pollutants.o3;

  const hasPm25Warning = pm25Level > 100;
  const hasO3Caution = o3Level > 80;

  return (
    <div className="info-panel">
      <button className="close-btn" onClick={onClose}>
        ×
      </button>
      <h4>{station.name}</h4>
      <div className="station-coord">
        坐标: {station.position.x.toFixed(2)}, {station.position.y.toFixed(2)}
      </div>

      <ul className="pollutant-list">
        {pollutantKeys.map((key) => (
          <li key={key} className="pollutant-item">
            <span
              className="pollutant-dot"
              style={{ backgroundColor: POLLUTANT_COLORS[key] }}
            />
            <span className="pollutant-name">{POLLUTANT_LABELS[key]}</span>
            <span className="pollutant-value">
              {station.pollutants[key].toFixed(1)} μg/m³
            </span>
          </li>
        ))}
      </ul>

      {hasPm25Warning && (
        <div className="health-advice warning">
          ⚠ PM2.5浓度过高，建议减少外出活动
        </div>
      )}

      {!hasPm25Warning && hasO3Caution && (
        <div className="health-advice caution">
          ◇ 臭氧浓度偏高，敏感人群注意防护
        </div>
      )}
    </div>
  );
};

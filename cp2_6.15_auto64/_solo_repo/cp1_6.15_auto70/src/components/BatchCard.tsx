import { useState } from 'react';
import { BatchRecord, FlavorProfile } from '../utils/types';
import FlavorWheel from './FlavorWheel';

interface BatchCardProps {
  record: BatchRecord;
  onDelete: (id: string) => void;
  onViewCurve: (record: BatchRecord) => void;
  onSelect: (id: string, selected: boolean) => void;
  onFlavorChange: (id: string, profile: FlavorProfile) => void;
  selected: boolean;
  removing: boolean;
}

export default function BatchCard({
  record,
  onDelete,
  onViewCurve,
  onSelect,
  onFlavorChange,
  selected,
  removing,
}: BatchCardProps) {
  const [flavorProfile, setFlavorProfile] = useState<FlavorProfile>(
    record.flavorProfile
  );

  const handleFlavorChange = (profile: FlavorProfile) => {
    setFlavorProfile(profile);
    onFlavorChange(record.id, profile);
  };

  return (
    <div
      className="batch-card"
      style={{
        borderRadius: 12,
        boxShadow: '0 2px 8px rgba(62,39,35,0.15)',
        overflow: 'hidden',
        background: '#FFF',
        transition: removing
          ? 'transform 0.3s ease-in, opacity 0.3s ease-in'
          : 'transform 0.2s, box-shadow 0.2s',
        transform: removing ? 'translateX(-100%)' : 'none',
        opacity: removing ? 0 : 1,
        position: 'relative',
      }}
    >
      <div
        style={{
          background: '#6F4E37',
          color: '#FFF',
          padding: '10px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontWeight: 'bold', fontSize: 15 }}>
          {record.batchNumber}
        </span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 12 }}>
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => onSelect(record.id, e.target.checked)}
              style={{ accentColor: '#6F4E37' }}
            />
            选择
          </label>
          <button
            onClick={() => onDelete(record.id)}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: '#FFF',
              borderRadius: 4,
              padding: '2px 10px',
              cursor: 'pointer',
              fontSize: 12,
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.35)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.2)';
            }}
          >
            删除
          </button>
        </div>
      </div>
      <div style={{ padding: '12px 16px', color: '#3E2723' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', fontSize: 13 }}>
          <div><span style={{ color: '#8D6E63' }}>生豆：</span>{record.beanName}</div>
          <div><span style={{ color: '#8D6E63' }}>日期：</span>{record.roastDate}</div>
          <div><span style={{ color: '#8D6E63' }}>时长：</span>{record.roastDuration} 分钟</div>
          <div><span style={{ color: '#8D6E63' }}>温度：</span>{record.roastTemperature}°C</div>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginTop: 12,
          }}
        >
          <FlavorWheel
            flavorProfile={flavorProfile}
            onChange={handleFlavorChange}
          />
        </div>
        <div style={{ marginTop: 10, textAlign: 'center' }}>
          <button
            onClick={() => onViewCurve(record)}
            style={{
              background: '#6F4E37',
              border: 'none',
              color: '#FFF',
              borderRadius: 6,
              padding: '6px 18px',
              cursor: 'pointer',
              fontSize: 13,
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.background = '#5a3d2b';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.background = '#6F4E37';
            }}
          >
            查看曲线
          </button>
        </div>
      </div>
    </div>
  );
}

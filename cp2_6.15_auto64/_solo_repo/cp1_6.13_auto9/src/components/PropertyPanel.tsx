import React from 'react';
import { useGalleryStore } from '@/store';
import { cmToPx } from '@/utils/geometry';
import type { Wall, PlacedExhibit, LightSource } from '@/types';

export const PropertyPanel: React.FC = () => {
  const { selectedElement, walls, exhibits, lights, updateWall, updateExhibit, updateLight } =
    useGalleryStore();

  if (!selectedElement) {
    return (
      <div
        style={{
          padding: '16px 14px',
          color: '#999',
          fontSize: 13,
          textAlign: 'center',
          borderTop: '1px solid #e0e0e0',
        }}
      >
        点击画布元素查看属性
      </div>
    );
  }

  if (selectedElement.type === 'wall') {
    const wall = walls.find((w) => w.id === selectedElement.id) as Wall | undefined;
    if (!wall) return null;
    return <WallProperties wall={wall} onUpdate={updateWall} />;
  }

  if (selectedElement.type === 'exhibit') {
    const exhibit = exhibits.find((e) => e.id === selectedElement.id) as
      | PlacedExhibit
      | undefined;
    if (!exhibit) return null;
    return <ExhibitProperties exhibit={exhibit} />;
  }

  if (selectedElement.type === 'light') {
    const light = lights.find((l) => l.id === selectedElement.id) as LightSource | undefined;
    if (!light) return null;
    return <LightProperties light={light} onUpdate={updateLight} />;
  }

  return null;
};

const WallProperties: React.FC<{
  wall: Wall;
  onUpdate: (id: string, updates: Partial<Wall>) => void;
}> = ({ wall, onUpdate }) => {
  return (
    <div style={{ padding: '12px 14px', borderTop: '1px solid #e0e0e0' }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 10 }}>
        墙壁属性
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <PropRow label="X">
          <PropInput
            value={Math.round(wall.x)}
            onChange={(v) => onUpdate(wall.id, { x: v })}
          />
        </PropRow>
        <PropRow label="Y">
          <PropInput
            value={Math.round(wall.y)}
            onChange={(v) => onUpdate(wall.id, { y: v })}
          />
        </PropRow>
        <PropRow label="宽度">
          <PropInput
            value={Math.round(wall.width)}
            onChange={(v) => onUpdate(wall.id, { width: Math.max(20, v) })}
          />
        </PropRow>
        <PropRow label="高度">
          <PropInput
            value={Math.round(wall.height)}
            onChange={(v) => onUpdate(wall.id, { height: Math.max(20, v) })}
          />
        </PropRow>
        <PropRow label="旋转">
          <select
            value={wall.rotation}
            onChange={(e) => onUpdate(wall.id, { rotation: Number(e.target.value) as Wall['rotation'] })}
            style={{
              width: '100%',
              padding: '4px 6px',
              borderRadius: 4,
              border: '1px solid #e0e0e0',
              fontSize: 12,
              backgroundColor: '#fff',
            }}
          >
            <option value={0}>0°</option>
            <option value={90}>90°</option>
            <option value={180}>180°</option>
            <option value={270}>270°</option>
          </select>
        </PropRow>
        <PropRow label="吸附">
          <span style={{ fontSize: 12, color: wall.isSnapping ? '#3b82f6' : '#999' }}>
            {wall.isSnapping ? '已吸附' : '无'}
          </span>
        </PropRow>
      </div>
    </div>
  );
};

const ExhibitProperties: React.FC<{ exhibit: PlacedExhibit }> = ({ exhibit }) => {
  const pxW = cmToPx(exhibit.physicalWidth);
  const pxH = cmToPx(exhibit.physicalHeight);
  return (
    <div style={{ padding: '12px 14px', borderTop: '1px solid #e0e0e0' }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 10 }}>
        展品属性
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <PropRow label="名称">
          <span style={{ fontSize: 12, color: '#333' }}>{exhibit.name}</span>
        </PropRow>
        <PropRow label="位置">
          <span style={{ fontSize: 12, color: '#555' }}>
            ({Math.round(exhibit.x)}, {Math.round(exhibit.y)})
          </span>
        </PropRow>
        <PropRow label="物理尺寸">
          <span style={{ fontSize: 12, color: '#555' }}>
            {exhibit.physicalWidth}×{exhibit.physicalHeight}cm
          </span>
        </PropRow>
        <PropRow label="画布尺寸">
          <span style={{ fontSize: 12, color: '#555' }}>
            {pxW}×{pxH}px
          </span>
        </PropRow>
        <PropRow label="颜色">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: 3,
                backgroundColor: exhibit.colorTag,
              }}
            />
            <span style={{ fontSize: 11, color: '#888' }}>{exhibit.colorTag}</span>
          </div>
        </PropRow>
      </div>
    </div>
  );
};

const LightProperties: React.FC<{
  light: LightSource;
  onUpdate: (id: string, updates: Partial<LightSource>) => void;
}> = ({ light, onUpdate }) => {
  return (
    <div style={{ padding: '12px 14px', borderTop: '1px solid #e0e0e0' }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 10 }}>
        灯光属性
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <PropRow label="位置">
          <span style={{ fontSize: 12, color: '#555' }}>
            ({Math.round(light.x)}, {Math.round(light.y)})
          </span>
        </PropRow>
        <PropRow label="强度">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
            <input
              type="range"
              min={0}
              max={100}
              value={light.intensity}
              onChange={(e) => onUpdate(light.id, { intensity: Number(e.target.value) })}
              style={{ flex: 1, accentColor: '#3b82f6' }}
            />
            <span
              style={{
                fontSize: 12,
                color: '#555',
                minWidth: 30,
                textAlign: 'right',
              }}
            >
              {light.intensity}
            </span>
          </div>
        </PropRow>
      </div>
    </div>
  );
};

const PropRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <span style={{ fontSize: 12, color: '#888', width: 56, flexShrink: 0 }}>{label}</span>
    <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
  </div>
);

const PropInput: React.FC<{
  value: number;
  onChange: (v: number) => void;
}> = ({ value, onChange }) => (
  <input
    type="number"
    value={value}
    onChange={(e) => onChange(Number(e.target.value))}
    style={{
      width: '100%',
      padding: '4px 6px',
      borderRadius: 4,
      border: '1px solid #e0e0e0',
      fontSize: 12,
      backgroundColor: '#fff',
    }}
  />
);

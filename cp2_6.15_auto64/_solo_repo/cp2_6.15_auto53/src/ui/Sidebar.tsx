import React, { useState, useRef } from 'react';
import * as THREE from 'three';
import { usePartsStore, PartType, PART_DEFINITIONS, MATERIAL_COLORS } from '../store/partsStore';
import { PartThumbnail3D } from './PartThumbnail3D';

interface PartCardProps {
  type: PartType;
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
}

function PartCard({ type, onClick, onDragStart }: PartCardProps) {
  const def = PART_DEFINITIONS[type];
  const [hovered, setHovered] = useState(false);

  return (
    <div
      draggable
      onClick={onClick}
      onDragStart={onDragStart}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '120px',
        height: '120px',
        borderRadius: '8px',
        background: hovered ? '#3e3e3e' : '#363636',
        boxShadow: hovered
          ? '0 4px 16px rgba(0,0,0,0.45), 0 2px 6px rgba(0,0,0,0.25)'
          : '0 2px 8px rgba(0,0,0,0.25)',
        transform: hovered ? 'translateY(-2px) scale(1.02)' : 'translateY(0)',
        transition: 'all 0.2s ease-out',
        cursor: 'grab',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: '6px',
        overflow: 'hidden',
        userSelect: 'none',
        border: hovered ? '1px solid #666' : '1px solid #3a3a3a',
      }}
    >
      <div style={{ width: '100%', height: '92px', display: 'block' }}>
        <PartThumbnail3D type={type} />
      </div>
      <div style={{
        fontSize: '11px',
        color: '#d4c5a8',
        marginTop: '2px',
        fontWeight: 500,
        letterSpacing: '0.3px',
      }}>
        {def.name}
      </div>
    </div>
  );
}

const PART_GROUPS = [
  {
    title: '直榫卯',
    items: [
      { type: 'tenon' as PartType, desc: '基础直榫头' },
      { type: 'mortise' as PartType, desc: '配套直卯眼' },
    ],
  },
  {
    title: '燕尾榫',
    items: [
      { type: 'dovetail_tenon' as PartType, desc: '燕尾榫头' },
      { type: 'dovetail_mortise' as PartType, desc: '燕尾卯眼' },
    ],
  },
  {
    title: 'L型连接',
    items: [
      { type: 'l_tenon' as PartType, desc: 'L型角榫头' },
      { type: 'l_mortise' as PartType, desc: 'L型角卯眼' },
    ],
  },
];

export function Sidebar() {
  const store = usePartsStore();
  const [dragOver, setDragOver] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const handleAddPart = (type: PartType) => {
    const idx = store.parts.length;
    const offsetX = (idx % 4 - 1.5) * 1.5;
    const offsetZ = Math.floor(idx / 4) * 1.5;
    store.addPart(type, new THREE.Vector3(offsetX, PART_DEFINITIONS[type].dimensions.height / 2, offsetZ));
  };

  const handleDragStart = (type: PartType) => (e: React.DragEvent) => {
    e.dataTransfer.setData('application/x-part-type', type);
    e.dataTransfer.effectAllowed = 'copy';
    try {
      const img = new Image();
      img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>';
      e.dataTransfer.setDragImage(img, 0, 0);
    } catch {}
  };

  return (
    <div
      ref={sidebarRef}
      style={{
        width: '280px',
        minWidth: '280px',
        height: '100%',
        background: '#2c2c2c',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRight: '1px solid #1a1a1a',
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
    >
      <div style={{
        padding: '16px 18px 12px',
        borderBottom: '1px solid #3a3a3a',
        background: 'linear-gradient(180deg, #333 0%, #2c2c2c 100%)',
      }}>
        <div style={{
          fontSize: '16px',
          fontWeight: 600,
          color: '#e8d9b8',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '4px',
        }}>
          <span style={{ fontSize: '20px' }}>🪵</span>
          零件库
        </div>
        <div style={{
          fontSize: '11px',
          color: '#888',
          letterSpacing: '0.3px',
        }}>
          拖拽或点击添加到工作台
        </div>
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px 14px',
      }}>
        {PART_GROUPS.map((group, gi) => (
          <div key={group.title} style={{ marginBottom: gi < PART_GROUPS.length - 1 ? '18px' : 0 }}>
            <div style={{
              fontSize: '11px',
              fontWeight: 600,
              color: '#9a8a6a',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '10px',
              paddingLeft: '2px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <span style={{
                display: 'inline-block',
                width: '12px',
                height: '2px',
                background: '#8b5e3c',
                borderRadius: '1px',
              }} />
              {group.title}
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '10px',
            }}>
              {group.items.map((item) => (
                <PartCard
                  key={item.type}
                  type={item.type}
                  onClick={() => handleAddPart(item.type)}
                  onDragStart={handleDragStart(item.type)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{
        padding: '12px 14px 14px',
        borderTop: '1px solid #3a3a3a',
        background: '#262626',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: '#777',
          marginBottom: '8px',
        }}>
          <span>工作台零件</span>
          <span style={{
            color: store.parts.length > 0 ? '#d4a76a' : '#666',
            fontWeight: 600,
          }}>
            {store.parts.length} / 8
          </span>
        </div>
        <div style={{
          height: '4px',
          background: '#1a1a1a',
          borderRadius: '2px',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${Math.min(store.parts.length / 8 * 100, 100)}%`,
            background: store.parts.length >= 8
              ? 'linear-gradient(90deg, #ff6b6b, #ee5a5a)'
              : 'linear-gradient(90deg, #d4a76a, #8b5e3c)',
            borderRadius: '2px',
            transition: 'width 0.3s ease',
          }} />
        </div>
        {store.parts.length >= 8 && (
          <div style={{
            fontSize: '10px',
            color: '#ff8a6a',
            marginTop: '6px',
          }}>
            ⚠ 接近推荐上限，可能影响性能
          </div>
        )}
      </div>
    </div>
  );
}

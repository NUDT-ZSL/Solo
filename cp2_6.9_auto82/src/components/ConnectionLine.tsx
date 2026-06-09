import React, { useState } from 'react';
import type { StickyNote, Connection } from '../types';

interface ConnectionLineProps {
  connection: Connection;
  fromNote: StickyNote;
  toNote: StickyNote;
  isGraphMode: boolean;
  onUpdateLabel: (id: string, label: string) => void;
  isMobile: boolean;
}

const ConnectionLine: React.FC<ConnectionLineProps> = ({
  connection,
  fromNote,
  toNote,
  isGraphMode,
  onUpdateLabel,
  isMobile
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(connection.label);

  const noteWidth = isMobile ? 100 : 120;
  const noteHeight = isMobile ? 80 : 100;

  const x1 = fromNote.x + noteWidth / 2;
  const y1 = fromNote.y + noteHeight / 2;
  const x2 = toNote.x + noteWidth / 2;
  const y2 = toNote.y + noteHeight / 2;

  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isGraphMode) {
      setIsEditing(true);
    }
  };

  const handleBlur = () => {
    onUpdateLabel(connection.id, editLabel.slice(0, 10));
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      handleBlur();
    }
  };

  if (isGraphMode) {
    return (
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="#4a4e69"
        strokeWidth={2}
        style={{ animation: 'lineFadeIn 0.3s ease-out' }}
      />
    );
  }

  const dx = x2 - x1;
  const dy = y2 - y1;
  const cx1 = x1 + dx * 0.5 - 40;
  const cy1 = y1 + dy * 0.5;
  const cx2 = x2 - dx * 0.5 + 40;
  const cy2 = y2 - dy * 0.5;

  const path = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;

  return (
    <g style={{ animation: 'lineFadeIn 0.3s ease-out' }}>
      <path
        d={path}
        stroke="#6c5b7b"
        strokeWidth={2}
        fill="none"
        opacity={0.7}
        onClick={handleClick}
        style={{ cursor: 'pointer' }}
      />
      <path
        d={path}
        stroke="transparent"
        strokeWidth={16}
        fill="none"
        onClick={handleClick}
        style={{ cursor: 'pointer' }}
      />

      {isEditing ? (
        <foreignObject x={midX - 50} y={midY - 14} width={100} height={28}>
          <input
            type="text"
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value.slice(0, 10))}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            autoFocus
            style={{
              width: '100%',
              height: '100%',
              fontSize: 10,
              textAlign: 'center',
              border: '1px solid #6c5b7b',
              borderRadius: 4,
              background: '#fff',
              color: '#8e7fa3',
              outline: 'none',
              padding: '2px 4px'
            }}
          />
        </foreignObject>
      ) : (
        <g onClick={handleClick} style={{ cursor: 'pointer' }}>
          <rect
            x={midX - 22}
            y={midY - 9}
            width={44}
            height={18}
            rx={4}
            fill="#fff"
            opacity={0.9}
          />
          <text
            x={midX}
            y={midY + 4}
            textAnchor="middle"
            fontSize={10}
            fill="#8e7fa3"
          >
            {connection.label}
          </text>
        </g>
      )}
    </g>
  );
};

export default ConnectionLine;

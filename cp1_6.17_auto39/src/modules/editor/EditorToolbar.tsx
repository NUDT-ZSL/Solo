import React from 'react';
import { TileType, TILE_COLORS, TILE_NAMES } from '../../types';

interface EditorToolbarProps {
  selectedTile: TileType;
  onTileSelect: (tile: TileType) => void;
  onClear: () => void;
  onExport: () => void;
}

const tileOptions: TileType[] = [1, 2, 3, 4];

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  selectedTile,
  onTileSelect,
  onClear,
  onExport,
}) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      padding: '8px',
    }}>
      <div style={{
        fontSize: '11px',
        color: '#8B949E',
        fontFamily: "'Orbitron', sans-serif",
        textTransform: 'uppercase',
        letterSpacing: '1px',
        marginBottom: '4px',
      }}>
        瓦片选择
      </div>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {tileOptions.map((tile) => (
          <button
            key={tile}
            onClick={() => onTileSelect(tile)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 10px',
              background: selectedTile === tile ? '#238636' : '#21262D',
              color: '#FFFFFF',
              border: selectedTile === tile ? '2px solid #FFD54F' : '1px solid #30363D',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontFamily: "'Noto Sans SC', sans-serif",
              transition: 'all 0.1s ease',
              transform: 'scale(1)',
            }}
            onMouseDown={(e) => {
              (e.target as HTMLElement).style.transform = 'scale(0.95) translateY(1px)';
            }}
            onMouseUp={(e) => {
              (e.target as HTMLElement).style.transform = 'scale(1)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.transform = 'scale(1)';
            }}
          >
            <span style={{
              display: 'inline-block',
              width: '14px',
              height: '14px',
              backgroundColor: TILE_COLORS[tile],
              borderRadius: tile === 4 ? '50%' : '2px',
              border: '1px solid rgba(255,255,255,0.2)',
            }} />
            {TILE_NAMES[tile]}
          </button>
        ))}
      </div>

      <div style={{
        fontSize: '10px',
        color: '#6E7681',
        fontFamily: "'JetBrains Mono', monospace",
        lineHeight: '1.6',
        padding: '6px 0',
        borderTop: '1px solid #30363D',
        borderBottom: '1px solid #30363D',
      }}>
        左键放置 · 右键擦除<br />
        Shift+拖拽 连续绘制
      </div>

      <div style={{ display: 'flex', gap: '6px' }}>
        <button
          onClick={onClear}
          style={{
            padding: '6px 12px',
            background: '#21262D',
            color: '#F85149',
            border: '1px solid #30363D',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
            fontFamily: "'Noto Sans SC', sans-serif",
            transition: 'all 0.1s ease',
          }}
          onMouseDown={(e) => {
            (e.target as HTMLElement).style.transform = 'scale(0.95) translateY(1px)';
          }}
          onMouseUp={(e) => {
            (e.target as HTMLElement).style.transform = 'scale(1)';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.transform = 'scale(1)';
          }}
        >
          清除画布
        </button>
        <button
          onClick={onExport}
          style={{
            padding: '6px 12px',
            background: '#238636',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
            fontFamily: "'Noto Sans SC', sans-serif",
            fontWeight: 700,
            transition: 'all 0.1s ease',
          }}
          onMouseDown={(e) => {
            (e.target as HTMLElement).style.transform = 'scale(0.95) translateY(1px)';
          }}
          onMouseUp={(e) => {
            (e.target as HTMLElement).style.transform = 'scale(1)';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.transform = 'scale(1)';
          }}
        >
          导出地图
        </button>
      </div>
    </div>
  );
};

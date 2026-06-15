import React from 'react';
import { LayoutBlock, BLOCK_LABELS, WIDTH_OPTIONS, CANVAS_WIDTH, calculateActualWidth } from './LayoutEngine';

interface PropertyPanelProps {
  selectedBlock: LayoutBlock | null;
  onWidthChange: (percent: number) => void;
  onBackgroundColorChange: (color: string) => void;
  onBorderRadiusChange: (radius: number) => void;
}

const PropertyPanel: React.FC<PropertyPanelProps> = ({
  selectedBlock,
  onWidthChange,
  onBackgroundColorChange,
  onBorderRadiusChange,
}) => {
  return (
    <div
      style={{
        width: 260,
        backgroundColor: '#ffffff',
        borderRadius: 8,
        padding: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        flexShrink: 0,
        height: '100%',
        overflow: 'auto',
        transition: 'opacity 0.25s ease',
      }}
    >
      <h2
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: '#2563eb',
          paddingBottom: 8,
          borderBottom: '2px solid #2563eb',
        }}
      >
        属性面板
      </h2>

      {!selectedBlock ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 200,
            color: '#9ca3af',
            fontSize: 13,
          }}
        >
          请选中一个布局块
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn 0.25s ease' }}>
          <div>
            <label style={labelStyle}>组件类型</label>
            <div
              style={{
                padding: '8px 12px',
                backgroundColor: '#f3f4f6',
                borderRadius: 6,
                fontSize: 13,
                color: '#374151',
                fontWeight: 500,
              }}
            >
              {BLOCK_LABELS[selectedBlock.type]}
            </div>
          </div>

          <div>
            <label style={labelStyle}>宽度</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {WIDTH_OPTIONS.map((percent) => {
                const isSelected = selectedBlock.widthPercent === percent;
                return (
                  <button
                    key={percent}
                    onClick={() => onWidthChange(percent)}
                    style={{
                      padding: '8px 4px',
                      fontSize: 12,
                      fontWeight: isSelected ? 600 : 400,
                      borderRadius: 6,
                      border: `1px solid ${isSelected ? '#2563eb' : '#d1d5db'}`,
                      backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                      color: isSelected ? '#2563eb' : '#374151',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = '#9ca3af';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = '#d1d5db';
                      }
                    }}
                  >
                    {percent}%
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop: 6, fontSize: 11, color: '#6b7280' }}>
              实际宽度: {calculateActualWidth(selectedBlock.widthPercent, CANVAS_WIDTH)}px
            </div>
          </div>

          <div>
            <label style={labelStyle}>背景色</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="color"
                value={selectedBlock.backgroundColor}
                onChange={(e) => onBackgroundColorChange(e.target.value)}
                style={{
                  width: 40,
                  height: 36,
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  cursor: 'pointer',
                  padding: 2,
                  backgroundColor: '#ffffff',
                }}
              />
              <input
                type="text"
                value={selectedBlock.backgroundColor}
                onChange={(e) => {
                  if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value) || e.target.value.length <= 7) {
                    onBackgroundColorChange(e.target.value);
                  }
                }}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  fontSize: 13,
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  outline: 'none',
                  fontFamily: 'monospace',
                  transition: 'border-color 0.2s ease',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#2563eb';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db';
                }}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>
              圆角大小: <span style={{ color: '#2563eb', fontWeight: 600 }}>{selectedBlock.borderRadius}px</span>
            </label>
            <input
              type="range"
              min={0}
              max={20}
              step={1}
              value={selectedBlock.borderRadius}
              onChange={(e) => onBorderRadiusChange(Number(e.target.value))}
              style={{
                width: '100%',
                height: 6,
                marginTop: 8,
                cursor: 'pointer',
                accentColor: '#2563eb',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#9ca3af', marginTop: 4 }}>
              <span>0px</span>
              <span>20px</span>
            </div>
          </div>

          <div
            style={{
              marginTop: 8,
              padding: 10,
              backgroundColor: '#f9fafb',
              borderRadius: 6,
              border: '1px solid #e5e7eb',
            }}
          >
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>位置信息</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
              <div>
                <span style={{ color: '#6b7280' }}>X: </span>
                <span style={{ color: '#374151', fontWeight: 500 }}>{selectedBlock.x}px</span>
              </div>
              <div>
                <span style={{ color: '#6b7280' }}>Y: </span>
                <span style={{ color: '#374151', fontWeight: 500 }}>{selectedBlock.y}px</span>
              </div>
              <div>
                <span style={{ color: '#6b7280' }}>宽: </span>
                <span style={{ color: '#374151', fontWeight: 500 }}>{selectedBlock.width}px</span>
              </div>
              <div>
                <span style={{ color: '#6b7280' }}>高: </span>
                <span style={{ color: '#374151', fontWeight: 500 }}>{selectedBlock.height}px</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: '#374151',
  marginBottom: 8,
};

export default PropertyPanel;

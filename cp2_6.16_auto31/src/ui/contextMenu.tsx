import { useState } from 'react';
import { useAppStore } from '../data/store';
import { addAnnotation as saveAnnotation } from '../data/storage';
import type { Annotation } from '../data/store';

const COLORS = [
  { name: '红', value: '#e53935' },
  { name: '橙', value: '#fb8c00' },
  { name: '黄', value: '#fdd835' },
  { name: '绿', value: '#43a047' },
  { name: '蓝', value: '#1e88e5' },
  { name: '紫', value: '#8e24aa' },
];

export function ContextMenu() {
  const rightClickMenu = useAppStore((s) => s.rightClickMenu);
  const setRightClickMenu = useAppStore((s) => s.setRightClickMenu);
  const addAnnotation = useAppStore((s) => s.addAnnotation);

  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[2].value);

  if (!rightClickMenu.visible || !rightClickMenu.position) return null;

  const handleConfirm = () => {
    if (!name.trim() || !rightClickMenu.position) return;

    const newAnnotation: Annotation = {
      id: `ann-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      color: selectedColor,
      position: rightClickMenu.position,
      createdAt: Date.now(),
    };

    addAnnotation(newAnnotation);
    saveAnnotation(newAnnotation).catch((err) =>
      console.error('Failed to save annotation:', err)
    );

    setName('');
    setSelectedColor(COLORS[2].value);
    setRightClickMenu({ ...rightClickMenu, visible: false });
  };

  const handleClose = () => {
    setName('');
    setSelectedColor(COLORS[2].value);
    setRightClickMenu({ ...rightClickMenu, visible: false });
  };

  return (
    <div
      style={{
        position: 'fixed',
        left: rightClickMenu.x,
        top: rightClickMenu.y,
        minWidth: '220px',
        padding: '16px',
        borderRadius: '12px',
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(129, 212, 250, 0.3)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        zIndex: 300,
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-5px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>

      <div
        style={{
          fontSize: '14px',
          fontWeight: 600,
          color: '#e0e0e0',
          marginBottom: '12px',
        }}
      >
        添加标注
      </div>

      <div style={{ marginBottom: '12px' }}>
        <div
          style={{
            fontSize: '11px',
            color: '#78909c',
            marginBottom: '6px',
          }}
        >
          标注名称
        </div>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="输入标注名称..."
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleConfirm();
            if (e.key === 'Escape') handleClose();
          }}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid rgba(129, 212, 250, 0.3)',
            background: 'rgba(255, 255, 255, 0.05)',
            color: '#e0e0e0',
            fontSize: '13px',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <div
          style={{
            fontSize: '11px',
            color: '#78909c',
            marginBottom: '8px',
          }}
        >
          选择颜色
        </div>
        <div
          style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          {COLORS.map((color) => (
            <button
              key={color.value}
              onClick={() => setSelectedColor(color.value)}
              title={color.name}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                border: selectedColor === color.value
                  ? '2px solid #e0e0e0'
                  : '2px solid transparent',
                background: color.value,
                cursor: 'pointer',
                transition: 'all 0.2s ease-out',
                boxShadow: selectedColor === color.value
                  ? `0 0 10px ${color.value}`
                  : 'none',
                transform: selectedColor === color.value ? 'scale(1.1)' : 'scale(1)',
              }}
            />
          ))}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '8px',
        }}
      >
        <button
          onClick={handleClose}
          style={{
            flex: 1,
            padding: '8px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            background: 'transparent',
            color: '#b0bec5',
            fontSize: '13px',
            cursor: 'pointer',
            transition: 'all 0.2s ease-out',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          取消
        </button>
        <button
          onClick={handleConfirm}
          disabled={!name.trim()}
          style={{
            flex: 1,
            padding: '8px',
            borderRadius: '8px',
            border: 'none',
            background: name.trim() ? '#00bcd4' : '#37474f',
            color: name.trim() ? '#00191e' : '#78909c',
            fontSize: '13px',
            fontWeight: 600,
            cursor: name.trim() ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s ease-out',
          }}
          onMouseEnter={(e) => {
            if (name.trim()) {
              e.currentTarget.style.background = '#26c6da';
            }
          }}
          onMouseLeave={(e) => {
            if (name.trim()) {
              e.currentTarget.style.background = '#00bcd4';
            }
          }}
        >
          确认
        </button>
      </div>
    </div>
  );
}

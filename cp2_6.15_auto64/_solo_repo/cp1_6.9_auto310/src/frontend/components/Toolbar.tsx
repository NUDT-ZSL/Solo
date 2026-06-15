import React, { useRef, useState } from 'react';
import { usePoem } from '../App';

interface ToolButton {
  key: string;
  label: string;
  gradient: string;
  icon: string;
  onClick: (e: React.MouseEvent) => void | Promise<void>;
}

const Toolbar: React.FC = () => {
  const { savePoem, setShowLoadModal, startPoemAnimation, clearCanvas } = usePoem();
  const [saveStatus, setSaveStatus] = useState<string>('');
  const rippleContainers: Record<string, React.RefObject<HTMLDivElement>> = {
    save: useRef<HTMLDivElement>(null),
    load: useRef<HTMLDivElement>(null),
    play: useRef<HTMLDivElement>(null),
    clear: useRef<HTMLDivElement>(null)
  };

  const createRipple = (e: React.MouseEvent, key: string) => {
    const container = rippleContainers[key].current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    const ripple = document.createElement('span');
    ripple.style.position = 'absolute';
    ripple.style.borderRadius = '50%';
    ripple.style.background = 'rgba(255,255,255,0.4)';
    ripple.style.transform = `translate(${x}px, ${y}px) scale(0)`;
    ripple.style.animation = 'ripple 0.4s ease-out forwards';
    ripple.style.pointerEvents = 'none';
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    ripple.style.zIndex = '0';
    container.appendChild(ripple);
    setTimeout(() => ripple.remove(), 400);
  };

  const handleSave = async (e: React.MouseEvent) => {
    createRipple(e, 'save');
    const id = await savePoem();
    if (id) {
      setSaveStatus(`✓ 已保存`);
      setTimeout(() => setSaveStatus(''), 2000);
    } else {
      setSaveStatus('✗ 保存失败');
      setTimeout(() => setSaveStatus(''), 2000);
    }
  };

  const handleLoad = (e: React.MouseEvent) => {
    createRipple(e, 'load');
    setShowLoadModal(true);
  };

  const handlePlay = (e: React.MouseEvent) => {
    createRipple(e, 'play');
    startPoemAnimation();
  };

  const handleClear = (e: React.MouseEvent) => {
    createRipple(e, 'clear');
    if (confirm('确定要清空画布吗？')) {
      clearCanvas();
    }
  };

  const buttons: ToolButton[] = [
    {
      key: 'save',
      label: '保存',
      icon: '💾',
      gradient: 'linear-gradient(135deg, rgba(255,215,0,0.25), rgba(255,180,0,0.15))',
      onClick: handleSave
    },
    {
      key: 'load',
      label: '加载',
      icon: '📂',
      gradient: 'linear-gradient(135deg, rgba(138,180,255,0.25), rgba(100,150,255,0.15))',
      onClick: handleLoad
    },
    {
      key: 'play',
      label: '诗行',
      icon: '🎭',
      gradient: 'linear-gradient(135deg, rgba(255,133,192,0.25), rgba(200,100,255,0.15))',
      onClick: handlePlay
    },
    {
      key: 'clear',
      label: '清空',
      icon: '🗑️',
      gradient: 'linear-gradient(135deg, rgba(255,120,120,0.25), rgba(255,80,80,0.15))',
      onClick: handleClear
    }
  ];

  const toolbarStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: 28,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: 14,
    padding: '10px 14px',
    borderRadius: 30,
    background: 'linear-gradient(160deg, rgba(40,40,90,0.8) 0%, rgba(20,20,60,0.8) 100%)',
    border: '1px solid rgba(255,255,255,0.1)',
    backdropFilter: 'blur(14px)',
    boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
    zIndex: 20
  };

  const statusStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: -24,
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: 12,
    color: saveStatus.startsWith('✓') ? 'rgba(180,255,180,0.9)' : 'rgba(255,180,180,0.9)',
    letterSpacing: 1,
    transition: 'opacity 0.3s'
  };

  return (
    <div style={toolbarStyle}>
      {buttons.map((btn) => {
        const btnStyle: React.CSSProperties = {
          position: 'relative',
          padding: '12px 26px',
          borderRadius: 20,
          background: btn.gradient,
          border: '1px solid rgba(255,255,255,0.1)',
          color: '#ffffff',
          fontSize: 15,
          fontWeight: 500,
          cursor: 'pointer',
          letterSpacing: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          overflow: 'hidden',
          transition: 'all 0.25s ease'
        };
        return (
          <div
            key={btn.key}
            ref={rippleContainers[btn.key]}
            style={{ position: 'relative', display: 'inline-block', borderRadius: 20, overflow: 'hidden' }}
          >
            <button
              style={btnStyle}
              onClick={(e) => {
                btn.onClick(e);
              }}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLElement).style.filter = 'brightness(1.18)';
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLElement).style.filter = '';
                (e.currentTarget as HTMLElement).style.transform = '';
              }}
            >
              <span style={{ fontSize: 16 }}>{btn.icon}</span>
              <span>{btn.label}</span>
            </button>
          </div>
        );
      })}
      {saveStatus && <div style={statusStyle}>{saveStatus}</div>}
    </div>
  );
};

export default Toolbar;

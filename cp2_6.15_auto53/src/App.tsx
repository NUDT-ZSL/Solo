import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { SceneManager } from './interaction/SceneManager';
import { Sidebar } from './ui/Sidebar';
import { PropertyPanel } from './ui/PropertyPanel';
import { Toolbar } from './ui/Toolbar';
import { usePartsStore, PartType, PART_DEFINITIONS } from './store/partsStore';

function App() {
  const store = usePartsStore();
  const sceneContainerRef = useRef<HTMLDivElement>(null);
  const [dragOverCenter, setDragOverCenter] = useState(false);
  const [dropIndicator, setDropIndicator] = useState<{ x: number; y: number; z: number } | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.target instanceof HTMLTextAreaElement) return;

      if ((e.key === 'Delete' || e.key === 'Backspace') && store.selectedPartId) {
        e.preventDefault();
        store.removePart(store.selectedPartId);
      }
      if (e.key === 'Escape') {
        store.selectPart(null);
      }
      if (e.key === 'd' && (e.ctrlKey || e.metaKey) && store.selectedPartId) {
        e.preventDefault();
        store.duplicatePart(store.selectedPartId);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [store]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.types.includes('application/x-part-type');
    if (type) {
      e.dataTransfer.dropEffect = 'copy';
      setDragOverCenter(true);
      const rect = sceneContainerRef.current?.getBoundingClientRect();
      if (rect) {
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const relX = (e.clientX - rect.left - rect.width / 2) / rect.width;
        const relZ = (e.clientY - rect.top - rect.height / 2) / rect.height;
        const worldX = relX * 10;
        const worldZ = relZ * 10;
        setDropIndicator({ x: worldX, y: 0, z: worldZ });
      }
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    setDragOverCenter(false);
    setDropIndicator(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverCenter(false);
    setDropIndicator(null);

    const partType = e.dataTransfer.getData('application/x-part-type') as PartType;
    if (!partType || !PART_DEFINITIONS[partType]) return;

    const rect = sceneContainerRef.current?.getBoundingClientRect();
    let position: THREE.Vector3;
    if (rect) {
      const relX = (e.clientX - rect.left - rect.width / 2) / rect.width;
      const relZ = (e.clientY - rect.top - rect.height / 2) / rect.height;
      const worldX = relX * 8;
      const worldZ = relZ * 8;
      const gridX = Math.round(worldX * 2) / 2;
      const gridZ = Math.round(worldZ * 2) / 2;
      position = new THREE.Vector3(gridX, PART_DEFINITIONS[partType].dimensions.height / 2, gridZ);
    } else {
      const idx = store.parts.length;
      const offsetX = (idx % 4 - 1.5) * 1.5;
      const offsetZ = Math.floor(idx / 4) * 1.5;
      position = new THREE.Vector3(offsetX, PART_DEFINITIONS[partType].dimensions.height / 2, offsetZ);
    }

    store.addPart(partType, position);
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: '#2c2c2c',
      overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
    }}>
      <Toolbar />

      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'row',
        overflow: 'hidden',
        minHeight: 0,
      }}>
        <Sidebar />

        <div
          ref={sceneContainerRef}
          style={{
            flex: 1,
            position: 'relative',
            overflow: 'hidden',
            background: '#e8d4b8',
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <SceneManager />

          {dragOverCenter && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(212, 167, 106, 0.12)',
              border: '2px dashed #8b5e3c',
              pointerEvents: 'none',
              zIndex: 5,
              margin: '8px',
              borderRadius: '8px',
              animation: 'dropPulse 1s ease-in-out infinite',
            }}>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'rgba(44, 44, 44, 0.92)',
                padding: '16px 24px',
                borderRadius: '10px',
                color: '#e8d9b8',
                fontSize: '15px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              }}>
                <span style={{ fontSize: '24px' }}>🪚</span>
                <span>松开鼠标放置零件到工作台</span>
              </div>
            </div>
          )}

          <div style={{
            position: 'absolute',
            bottom: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '16px',
            zIndex: 4,
            pointerEvents: 'none',
          }}>
            <HintBadge icon="🖱️" text="拖拽零件移动" />
            <HintBadge icon="🔄" text="滚轮旋转Y轴(15°)" />
            <HintBadge icon="▶️" text="右键更多操作" />
            <HintBadge icon="🎮" text="空白处旋转视角" />
          </div>

          {store.parts.length === 0 && (
            <div style={{
              position: 'absolute',
              top: '40px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(44, 44, 44, 0.9)',
              padding: '14px 22px',
              borderRadius: '10px',
              color: '#d4c5a8',
              fontSize: '13px',
              zIndex: 4,
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              maxWidth: '90%',
              pointerEvents: 'none',
            }}>
              <span style={{ fontSize: '22px' }}>👈</span>
              <span>从左侧<strong style={{ color: '#d4a76a' }}>零件库</strong>点击或拖拽零件开始设计</span>
            </div>
          )}
        </div>

        <PropertyPanel />
      </div>

      <style>{`
        @keyframes dropPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #262626;
        }
        ::-webkit-scrollbar-thumb {
          background: #4a4a4a;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #5a5a5a;
        }
        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
          cursor: pointer;
        }
        input[type="range"]::-webkit-slider-track {
          height: 4px;
          background: #3a3a3a;
          border-radius: 2px;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #d4a76a;
          margin-top: -5px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          transition: transform 0.15s ease;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.15);
          background: #e0b678;
        }
        input[type="range"]::-moz-range-track {
          height: 4px;
          background: #3a3a3a;
          border-radius: 2px;
        }
        input[type="range"]::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #d4a76a;
          border: none;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
      `}</style>
    </div>
  );
}

function HintBadge({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{
      background: 'rgba(44, 44, 44, 0.85)',
      padding: '7px 12px',
      borderRadius: '8px',
      color: '#c9b99a',
      fontSize: '11px',
      fontWeight: 500,
      display: 'flex',
      alignItems: 'center',
      gap: '7px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      backdropFilter: 'blur(4px)',
      border: '1px solid rgba(212,167,106,0.15)',
    }}>
      <span style={{ fontSize: '13px' }}>{icon}</span>
      <span>{text}</span>
    </div>
  );
}

export default App;

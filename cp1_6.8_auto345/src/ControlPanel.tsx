import React, { useState, useCallback } from 'react';
import type { Keyframe, PuppetCharacter } from './ShadowStage';
import { AnimationRecorder } from './utils/animationRecorder';

interface ControlPanelProps {
  characters: PuppetCharacter[];
  onAddCharacter: (type: string, name: string) => void;
  onRemoveCharacter: (id: string) => void;
  selectedId: string | null;
  lightPos: { x: number; y: number };
  isPlaying: boolean;
  onTogglePlay: () => void;
  keyframes: Keyframe[];
  onAddKeyframe: (kf: Keyframe) => void;
  currentTime: number;
  totalDuration: number;
  onSetCurrentTime: (t: number) => void;
  onSetTotalDuration: (d: number) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

const CHARACTER_PRESETS = [
  { type: 'monkey', name: '灵猴', icon: '🐒' },
  { type: 'crane', name: '仙鹤', icon: '🦢' },
  { type: 'scholar', name: '书生', icon: '📖' },
  { type: 'warrior', name: '武将', icon: '⚔️' },
  { type: 'dragon', name: '神龙', icon: '🐉' },
  { type: 'lady', name: '仕女', icon: '🎎' },
];

const recorder = new AnimationRecorder();

const ControlPanel: React.FC<ControlPanelProps> = ({
  characters,
  onAddCharacter,
  onRemoveCharacter,
  selectedId,
  lightPos,
  isPlaying,
  onTogglePlay,
  keyframes,
  onAddKeyframe,
  currentTime,
  totalDuration,
  onSetCurrentTime,
  onSetTotalDuration,
  canvasRef,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string>('characters');

  const handleRecordToggle = useCallback(async () => {
    if (isRecording) {
      await recorder.stopAndDownload(`影子戏法-${Date.now()}.webm`);
      setIsRecording(false);
    } else {
      if (canvasRef.current) {
        const started = recorder.start(canvasRef.current);
        setIsRecording(started);
      }
    }
  }, [isRecording, canvasRef]);

  const handleAddKeyframe = useCallback(() => {
    const charStates: Record<string, { x: number; y: number; rotation: number; scale: number }> = {};
    for (const c of characters) {
      charStates[c.id] = { x: c.x, y: c.y, rotation: c.rotation, scale: c.scale };
    }
    onAddKeyframe({
      time: currentTime,
      characterStates: charStates,
      lightX: lightPos.x,
      lightY: lightPos.y,
    });
  }, [characters, currentTime, lightPos, onAddKeyframe]);

  const selectedChar = characters.find((c) => c.id === selectedId);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? '' : section);
  };

  const panelStyle: React.CSSProperties = {
    position: 'absolute',
    right: 0,
    top: 0,
    width: '280px',
    height: '100%',
    background: 'rgba(90, 70, 40, 0.15)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderLeft: '2px solid rgba(180, 140, 80, 0.4)',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    zIndex: 10,
    scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(180, 140, 80, 0.3) transparent',
  };

  const sectionHeaderStyle: React.CSSProperties = {
    padding: '10px 14px',
    background: 'rgba(120, 90, 50, 0.2)',
    borderBottom: '1px solid rgba(180, 140, 80, 0.3)',
    borderTop: '1px solid rgba(180, 140, 80, 0.3)',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: '#c8a860',
    fontSize: '13px',
    fontWeight: 600,
    letterSpacing: '1px',
    userSelect: 'none',
    transition: 'background 0.2s',
  };

  const sectionContentStyle: React.CSSProperties = {
    padding: '10px 14px',
  };

  const btnBase: React.CSSProperties = {
    padding: '6px 12px',
    borderRadius: '20px',
    border: '1.5px solid rgba(180, 140, 80, 0.5)',
    background: 'rgba(100, 75, 40, 0.2)',
    color: '#d4b870',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    outline: 'none',
  };

  return (
    <div style={panelStyle}>
      <div style={{
        padding: '14px 14px 10px',
        borderBottom: '2px solid rgba(180, 140, 80, 0.3)',
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: '18px',
          fontWeight: 700,
          color: '#c8a860',
          letterSpacing: '3px',
          textShadow: '0 0 10px rgba(200, 168, 96, 0.3)',
        }}>
          影子戏法
        </div>
        <div style={{ fontSize: '10px', color: 'rgba(200, 168, 96, 0.5)', marginTop: '2px' }}>
          Shadow Puppet Theater
        </div>
      </div>

      <div>
        <div style={sectionHeaderStyle} onClick={() => toggleSection('characters')}>
          <span>🎭 角色库</span>
          <span>{expandedSection === 'characters' ? '▾' : '▸'}</span>
        </div>
        {expandedSection === 'characters' && (
          <div style={sectionContentStyle}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
              {CHARACTER_PRESETS.map((preset) => (
                <button
                  key={preset.type}
                  onClick={() => onAddCharacter(preset.type, preset.name)}
                  style={{
                    ...btnBase,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px',
                    padding: '10px 6px',
                    width: '100%',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(180, 140, 80, 0.25)';
                    e.currentTarget.style.boxShadow = '0 0 12px rgba(200, 168, 96, 0.3)';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(100, 75, 40, 0.2)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  <span style={{ fontSize: '22px' }}>{preset.icon}</span>
                  <span style={{ fontSize: '11px' }}>{preset.name}</span>
                </button>
              ))}
            </div>
            <div style={{ borderTop: '1px solid rgba(180, 140, 80, 0.2)', paddingTop: '8px' }}>
              <div style={{ fontSize: '11px', color: 'rgba(200, 168, 96, 0.6)', marginBottom: '6px' }}>
                舞台角色 ({characters.length}/10)
              </div>
              {characters.map((c) => (
                <div
                  key={c.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '5px 8px',
                    marginBottom: '3px',
                    borderRadius: '12px',
                    background: c.id === selectedId ? 'rgba(200, 168, 96, 0.15)' : 'transparent',
                    border: c.id === selectedId ? '1px solid rgba(200, 168, 96, 0.3)' : '1px solid transparent',
                    transition: 'all 0.2s',
                  }}
                >
                  <span style={{ fontSize: '12px', color: '#c8a860' }}>
                    {CHARACTER_PRESETS.find((p) => p.type === c.type)?.icon} {c.name}
                  </span>
                  <button
                    onClick={() => onRemoveCharacter(c.id)}
                    style={{
                      ...btnBase,
                      padding: '2px 8px',
                      fontSize: '10px',
                      color: '#c88060',
                      borderColor: 'rgba(200, 128, 96, 0.4)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(200, 80, 60, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(100, 75, 40, 0.2)';
                    }}
                  >
                    移除
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div>
        <div style={sectionHeaderStyle} onClick={() => toggleSection('properties')}>
          <span>⚙️ 属性</span>
          <span>{expandedSection === 'properties' ? '▾' : '▸'}</span>
        </div>
        {expandedSection === 'properties' && (
          <div style={sectionContentStyle}>
            {selectedChar ? (
              <div style={{ fontSize: '12px', color: '#c8a860' }}>
                <div style={{ marginBottom: '8px', padding: '6px 8px', background: 'rgba(200, 168, 96, 0.08)', borderRadius: '8px' }}>
                  <div>选中: {selectedChar.name}</div>
                  <div style={{ fontSize: '10px', color: 'rgba(200, 168, 96, 0.5)', marginTop: '2px' }}>
                    位置 ({Math.round(selectedChar.x)}, {Math.round(selectedChar.y)})
                  </div>
                  <div style={{ fontSize: '10px', color: 'rgba(200, 168, 96, 0.5)' }}>
                    旋转 {Math.round(selectedChar.rotation * 180 / Math.PI)}° | 缩放 {selectedChar.scale.toFixed(2)}x
                  </div>
                </div>
                <div style={{ fontSize: '10px', color: 'rgba(200, 168, 96, 0.4)' }}>
                  💡 拖拽移动角色，双指旋转/缩放
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '12px', color: 'rgba(200, 168, 96, 0.4)', textAlign: 'center', padding: '8px' }}>
                点击舞台上的角色选中
              </div>
            )}
            <div style={{ marginTop: '10px', borderTop: '1px solid rgba(180, 140, 80, 0.2)', paddingTop: '8px' }}>
              <div style={{ fontSize: '11px', color: 'rgba(200, 168, 96, 0.6)', marginBottom: '6px' }}>
                🔦 光源位置
              </div>
              <div style={{ fontSize: '12px', color: '#c8a860' }}>
                ({Math.round(lightPos.x)}, {Math.round(lightPos.y)})
              </div>
              <div style={{ fontSize: '10px', color: 'rgba(200, 168, 96, 0.4)', marginTop: '2px' }}>
                点击舞台空白处设置光源
              </div>
            </div>
          </div>
        )}
      </div>

      <div>
        <div style={sectionHeaderStyle} onClick={() => toggleSection('timeline')}>
          <span>🎬 时间轴</span>
          <span>{expandedSection === 'timeline' ? '▾' : '▸'}</span>
        </div>
        {expandedSection === 'timeline' && (
          <div style={sectionContentStyle}>
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '11px', color: 'rgba(200, 168, 96, 0.6)', marginBottom: '6px' }}>
                时长: {totalDuration}s
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <input
                  type="range"
                  min={1}
                  max={30}
                  step={0.5}
                  value={totalDuration}
                  onChange={(e) => onSetTotalDuration(Number(e.target.value))}
                  style={{
                    flex: 1,
                    accentColor: '#c8a860',
                    height: '4px',
                  }}
                />
                <span style={{ fontSize: '11px', color: '#c8a860', minWidth: '30px' }}>{totalDuration}s</span>
              </div>
            </div>

            <div
              style={{
                position: 'relative',
                height: '50px',
                background: 'rgba(80, 60, 30, 0.15)',
                borderRadius: '10px',
                border: '1px solid rgba(180, 140, 80, 0.2)',
                marginBottom: '10px',
                cursor: 'pointer',
                overflow: 'hidden',
              }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width;
                onSetCurrentTime(Math.max(0, Math.min(1, x)));
              }}
            >
              {keyframes.map((kf, i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: `${kf.time * 100}%`,
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: '#c8a860',
                    border: '1.5px solid rgba(220, 190, 120, 0.8)',
                    boxShadow: '0 0 6px rgba(200, 168, 96, 0.4)',
                  }}
                  title={`关键帧 ${i + 1} @ ${(kf.time * totalDuration).toFixed(1)}s`}
                />
              ))}
              <div
                style={{
                  position: 'absolute',
                  left: `${currentTime * 100}%`,
                  top: 0,
                  bottom: 0,
                  width: '2px',
                  background: '#e8c878',
                  boxShadow: '0 0 8px rgba(232, 200, 120, 0.6)',
                  transition: 'left 0.05s linear',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: `${currentTime * 100}%`,
                  top: '-2px',
                  transform: 'translateX(-50%)',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#e8c878',
                  boxShadow: '0 0 10px rgba(232, 200, 120, 0.8)',
                }}
              />
            </div>

            <div style={{ fontSize: '11px', color: 'rgba(200, 168, 96, 0.5)', marginBottom: '6px' }}>
              关键帧: {keyframes.length} | 当前: {(currentTime * totalDuration).toFixed(1)}s
            </div>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                onClick={handleAddKeyframe}
                style={btnBase}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(180, 140, 80, 0.25)';
                  e.currentTarget.style.boxShadow = '0 0 12px rgba(200, 168, 96, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(100, 75, 40, 0.2)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                📍 添加关键帧
              </button>
              <button
                onClick={onTogglePlay}
                style={{
                  ...btnBase,
                  background: isPlaying ? 'rgba(200, 120, 60, 0.2)' : 'rgba(100, 160, 80, 0.2)',
                  borderColor: isPlaying ? 'rgba(200, 120, 60, 0.5)' : 'rgba(100, 160, 80, 0.5)',
                  color: isPlaying ? '#e8a060' : '#90c870',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 12px rgba(200, 168, 96, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {isPlaying ? '⏸ 停止' : '▶ 播放'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div>
        <div style={sectionHeaderStyle} onClick={() => toggleSection('record')}>
          <span>🎥 录制</span>
          <span>{expandedSection === 'record' ? '▾' : '▸'}</span>
        </div>
        {expandedSection === 'record' && (
          <div style={sectionContentStyle}>
            <button
              onClick={handleRecordToggle}
              style={{
                ...btnBase,
                width: '100%',
                padding: '10px',
                background: isRecording ? 'rgba(220, 60, 60, 0.2)' : 'rgba(100, 75, 40, 0.2)',
                borderColor: isRecording ? 'rgba(220, 60, 60, 0.5)' : 'rgba(180, 140, 80, 0.5)',
                color: isRecording ? '#e86060' : '#d4b870',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = isRecording
                  ? '0 0 15px rgba(220, 60, 60, 0.4)'
                  : '0 0 12px rgba(200, 168, 96, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <span style={{
                width: '10px',
                height: '10px',
                borderRadius: isRecording ? '2px' : '50%',
                background: isRecording ? '#e86060' : '#c8a860',
                animation: isRecording ? 'none' : 'none',
                boxShadow: isRecording ? '0 0 8px rgba(220, 60, 60, 0.6)' : 'none',
              }} />
              {isRecording ? '⏹ 停止录制并下载' : '🔴 开始录制'}
            </button>
            <div style={{ fontSize: '10px', color: 'rgba(200, 168, 96, 0.4)', marginTop: '6px', textAlign: 'center' }}>
              {isRecording ? '正在录制舞台画面...' : '录制为WebM视频格式'}
            </div>
          </div>
        )}
      </div>

      <div style={{
        marginTop: 'auto',
        padding: '10px 14px',
        borderTop: '1px solid rgba(180, 140, 80, 0.2)',
        fontSize: '10px',
        color: 'rgba(200, 168, 96, 0.3)',
        textAlign: 'center',
      }}>
        点击空白处设置光源 · 拖拽移动角色
      </div>
    </div>
  );
};

export default ControlPanel;

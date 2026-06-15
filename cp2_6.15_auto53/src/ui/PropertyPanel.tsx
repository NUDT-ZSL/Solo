import React, { useMemo } from 'react';
import { usePartsStore, MaterialType, MATERIAL_COLORS } from '../store/partsStore';
import { animationController } from '../interaction/AnimationController';

const MATERIAL_OPTIONS: { type: MaterialType; name: string }[] = [
  { type: 'oak', name: '橡木' },
  { type: 'walnut', name: '胡桃木' },
  { type: 'cherry', name: '樱桃木' },
  { type: 'maple', name: '枫木' },
];

function RotationSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const degrees = Math.round((value * 180) / Math.PI);
  const displayDeg = ((degrees % 360) + 360) % 360;

  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '6px',
      }}>
        <span style={{ fontSize: '12px', color: '#aaa', fontWeight: 500 }}>{label}</span>
        <span style={{
          fontSize: '12px',
          color: '#d4a76a',
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
          background: 'rgba(212,167,106,0.1)',
          padding: '2px 8px',
          borderRadius: '4px',
          transition: 'all 0.3s ease',
        }}>
          {displayDeg}°
        </span>
      </div>
      <input
        type="range"
        min={-180}
        max={180}
        step={15}
        value={degrees}
        onChange={(e) => onChange((parseInt(e.target.value) * Math.PI) / 180)}
        style={{
          width: '100%',
          height: '4px',
          accentColor: '#d4a76a',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
        }}
      />
    </div>
  );
}

function DimensionRow({ label, value, unit = 'cm' }: { label: string; value: number; unit?: string }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '7px 10px',
      borderRadius: '5px',
      background: '#2a2a2a',
      marginBottom: '5px',
      transition: 'background 0.3s ease',
    }}>
      <span style={{ fontSize: '12px', color: '#999' }}>{label}</span>
      <span style={{
        fontSize: '13px',
        color: '#ddd',
        fontWeight: 600,
        fontVariantNumeric: 'tabular-nums',
        transition: 'color 0.3s ease',
      }}>
        {value.toFixed(1)} <span style={{ color: '#777', fontSize: '11px', fontWeight: 400 }}>{unit}</span>
      </span>
    </div>
  );
}

export function PropertyPanel() {
  const store = usePartsStore();
  const selectedPart = useMemo(
    () => store.parts.find((p) => p.id === store.selectedPartId) || null,
    [store.parts, store.selectedPartId]
  );
  const connections = store.connections;

  return (
    <div style={{
      width: '260px',
      minWidth: '260px',
      height: '100%',
      background: '#2c2c2c',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      borderLeft: '1px solid #1a1a1a',
    }}>
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
          <span style={{ fontSize: '20px' }}>⚙️</span>
          属性面板
        </div>
        <div style={{
          fontSize: '11px',
          color: '#888',
          letterSpacing: '0.3px',
        }}>
          {selectedPart ? '当前选中零件详情' : '点击零件查看属性'}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
        {!selectedPart ? (
          <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#555',
            textAlign: 'center',
            padding: '20px',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.4 }}>🔍</div>
            <div style={{ fontSize: '13px', marginBottom: '6px', color: '#777' }}>未选择零件</div>
            <div style={{ fontSize: '11px', color: '#555', lineHeight: 1.6 }}>
              在工作台点击任意零件<br />即可查看和编辑属性
            </div>
          </div>
        ) : (
          <>
            <div style={{
              marginBottom: '16px',
              paddingBottom: '14px',
              borderBottom: '1px solid #383838',
              transition: 'all 0.3s ease',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '6px',
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: `linear-gradient(135deg, ${MATERIAL_COLORS[selectedPart.material]}dd, ${MATERIAL_COLORS[selectedPart.material]}88)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                }}>
                  {selectedPart.type.includes('tenon') ? '🔲' : '⬜'}
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#eee' }}>
                    {selectedPart.name}
                  </div>
                  <div style={{
                    fontSize: '10px',
                    color: '#777',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                  }}>
                    ID: {selectedPart.id.slice(-6)}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '16px', transition: 'all 0.3s ease' }}>
              <div style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#9a8a6a',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '10px',
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
                材料纹理
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '6px',
              }}>
                {MATERIAL_OPTIONS.map((mat) => {
                  const selected = selectedPart.material === mat.type;
                  return (
                    <div
                      key={mat.type}
                      onClick={() => store.updatePart(selectedPart.id, { material: mat.type })}
                      style={{
                        aspectRatio: '1',
                        borderRadius: '6px',
                        background: MATERIAL_COLORS[mat.type],
                        cursor: 'pointer',
                        position: 'relative',
                        boxShadow: selected
                          ? `0 0 0 2px #d4a76a, 0 2px 8px rgba(212,167,106,0.4)`
                          : '0 2px 4px rgba(0,0,0,0.25)',
                        transform: selected ? 'translateY(-2px)' : 'translateY(0)',
                        transition: 'all 0.2s ease-out',
                      }}
                      onMouseEnter={(e) => {
                        if (!selected) e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        if (!selected) e.currentTarget.style.transform = 'translateY(0)';
                      }}
                      title={mat.name}
                    >
                      {selected && (
                        <div style={{
                          position: 'absolute',
                          top: '3px',
                          right: '3px',
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          background: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '8px',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                        }}>
                          ✓
                        </div>
                      )}
                      <div style={{
                        position: 'absolute',
                        bottom: '-18px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        fontSize: '10px',
                        color: '#999',
                        whiteSpace: 'nowrap',
                      }}>
                        {mat.name}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ height: '22px' }} />
            </div>

            <div style={{ marginBottom: '16px', transition: 'all 0.3s ease' }}>
              <div style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#9a8a6a',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '10px',
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
                尺寸标注
              </div>
              <DimensionRow label="宽度 (X)" value={selectedPart.dimensions.width * 10} />
              <DimensionRow label="高度 (Y)" value={selectedPart.dimensions.height * 10} />
              <DimensionRow label="深度 (Z)" value={selectedPart.dimensions.depth * 10} />
            </div>

            <div style={{ marginBottom: '16px', transition: 'all 0.3s ease' }}>
              <div style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#9a8a6a',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '10px',
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
                旋转角度
              </div>
              <RotationSlider
                label="X 轴 (俯仰)"
                value={selectedPart.rotation.x}
                onChange={(v) => {
                  const newRot = selectedPart.rotation.clone();
                  newRot.x = v;
                  store.setPartRotation(selectedPart.id, newRot);
                }}
              />
              <RotationSlider
                label="Y 轴 (偏航)"
                value={selectedPart.rotation.y}
                onChange={(v) => {
                  const newRot = selectedPart.rotation.clone();
                  newRot.y = v;
                  store.setPartRotation(selectedPart.id, newRot);
                }}
              />
              <RotationSlider
                label="Z 轴 (翻滚)"
                value={selectedPart.rotation.z}
                onChange={(v) => {
                  const newRot = selectedPart.rotation.clone();
                  newRot.z = v;
                  store.setPartRotation(selectedPart.id, newRot);
                }}
              />
              <div style={{
                fontSize: '10px',
                color: '#666',
                marginTop: '4px',
                padding: '6px 8px',
                background: '#262626',
                borderRadius: '4px',
                lineHeight: 1.5,
              }}>
                💡 鼠标悬停零件时滚动滚轮<br />可快速旋转 Y 轴（每次 15°）
              </div>
            </div>

            {selectedPart.connectedTo.length > 0 && (
              <div style={{ marginBottom: '16px', transition: 'all 0.3s ease' }}>
                <div style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#9a8a6a',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginBottom: '10px',
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
                  连接状态
                </div>
                <div style={{
                  padding: '10px 12px',
                  borderRadius: '6px',
                  background: 'rgba(74, 222, 128, 0.08)',
                  border: '1px solid rgba(74, 222, 128, 0.25)',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '6px',
                  }}>
                    <span style={{ fontSize: '16px' }}>🔗</span>
                    <span style={{ fontSize: '13px', color: '#86efac', fontWeight: 600 }}>
                      已连接 {selectedPart.connectedTo.length} 个零件
                    </span>
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: '#666',
                  }}>
                    右键点击可拆解连接
                  </div>
                </div>
              </div>
            )}

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              marginTop: '8px',
            }}>
              <button
                onClick={() => animationController.animateDisassemblePart(selectedPart.id, 0)}
                disabled={selectedPart.connectedTo.length === 0}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: selectedPart.connectedTo.length > 0 ? 'pointer' : 'not-allowed',
                  background: selectedPart.connectedTo.length > 0
                    ? 'linear-gradient(135deg, #5a4025, #8b5e3c)'
                    : '#333',
                  color: selectedPart.connectedTo.length > 0 ? '#fff' : '#666',
                  fontSize: '13px',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease-out',
                  boxShadow: selectedPart.connectedTo.length > 0
                    ? '0 2px 6px rgba(139,94,60,0.3)'
                    : 'none',
                  opacity: selectedPart.connectedTo.length > 0 ? 1 : 0.6,
                }}
                onMouseEnter={(e) => {
                  if (selectedPart.connectedTo.length > 0) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(139,94,60,0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  if (selectedPart.connectedTo.length > 0) {
                    e.currentTarget.style.boxShadow = '0 2px 6px rgba(139,94,60,0.3)';
                  }
                }}
              >
                <span>🔓</span>
                拆解此零件
              </button>
              <button
                onClick={() => store.duplicatePart(selectedPart.id)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #444',
                  cursor: 'pointer',
                  background: '#333',
                  color: '#ddd',
                  fontSize: '13px',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease-out',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#3e3e3e';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#333';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <span>📋</span>
                复制零件
              </button>
              <button
                onClick={() => store.removePart(selectedPart.id)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #4a2a2a',
                  cursor: 'pointer',
                  background: 'rgba(239, 68, 68, 0.08)',
                  color: '#f87171',
                  fontSize: '13px',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease-out',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.18)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <span>🗑️</span>
                删除零件
              </button>
            </div>
          </>
        )}
      </div>

      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid #3a3a3a',
        background: '#262626',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: '#888',
        }}>
          <span>连接总数</span>
          <span style={{ color: connections.length > 0 ? '#86efac' : '#666', fontWeight: 600 }}>
            {connections.length}
          </span>
        </div>
      </div>
    </div>
  );
}

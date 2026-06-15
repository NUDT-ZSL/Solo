import React from 'react';
import type { InfoData, Vec2 } from '../canvasEngine';

interface InfoPanelProps {
  infoData: InfoData;
  isSimulating: boolean;
  terrainCount: number;
  entityCount: number;
}

function formatNormal(normal: Vec2 | null): string {
  if (!normal) return '无';
  if (normal.x > 0.5) return '→ 右';
  if (normal.x < -0.5) return '← 左';
  if (normal.y > 0.5) return '↓ 下';
  if (normal.y < -0.5) return '↑ 上';
  return `${normal.x.toFixed(1)}, ${normal.y.toFixed(1)}`;
}

const InfoPanel: React.FC<InfoPanelProps> = ({
  infoData,
  isSimulating,
  terrainCount,
  entityCount
}) => {
  const { playerPos, playerVel, onGround, collisionNormal } = infoData;

  return (
    <div style={{
      width: 200,
      minWidth: 200,
      background: '#1e1e2e',
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      borderLeft: '1px solid #2a2a3e',
      overflowY: 'auto'
    }}>
      <div style={{
        fontSize: 14,
        fontWeight: 600,
        color: '#e0e0e0',
        letterSpacing: 1,
        textTransform: 'uppercase'
      }}>
        实时信息
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }}>
        <div style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: isSimulating ? '#00c853' : '#555555',
          boxShadow: isSimulating ? '0 0 8px #00c853' : 'none',
          transition: 'all 0.2s ease'
        }} />
        <span style={{
          fontSize: 12,
          color: '#cccccc'
        }}>
          {isSimulating ? '模拟运行中' : '编辑模式'}
        </span>
      </div>

      <div style={{
        height: 1,
        background: '#2a2a3e'
      }} />

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }}>
        <div style={{
          fontSize: 11,
          color: '#888888',
          textTransform: 'uppercase',
          letterSpacing: 0.5
        }}>
          玩家状态
        </div>

        <div style={{
          background: '#161622',
          borderRadius: 6,
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 10
        }}>
          <div>
            <div style={{ fontSize: 10, color: '#666666', marginBottom: 4 }}>位置坐标</div>
            <div style={{
              fontSize: 12,
              color: '#cccccc',
              fontFamily: 'monospace',
              display: 'flex',
              gap: 12
            }}>
              <span>X: <span style={{ color: '#4a90d9' }}>{playerPos?.x ?? '--'}</span></span>
              <span>Y: <span style={{ color: '#e74c3c' }}>{playerPos?.y ?? '--'}</span></span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 10, color: '#666666', marginBottom: 4 }}>速度向量</div>
            <div style={{
              fontSize: 12,
              color: '#cccccc',
              fontFamily: 'monospace',
              display: 'flex',
              gap: 12
            }}>
              <span>Vx: <span style={{ color: '#4a90d9' }}>{playerVel?.x ?? '--'}</span></span>
              <span>Vy: <span style={{ color: '#e74c3c' }}>{playerVel?.y ?? '--'}</span></span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 10, color: '#666666', marginBottom: 4 }}>是否在地面</div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: onGround ? '#00c853' : '#555555'
              }} />
              <span style={{
                fontSize: 12,
                color: onGround ? '#00c853' : '#888888'
              }}>
                {onGround ? '是 (Grounded)' : '否 (Airborne)'}
              </span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 10, color: '#666666', marginBottom: 4 }}>碰撞法线</div>
            <div style={{
              fontSize: 12,
              color: collisionNormal ? '#ffcc00' : '#555555',
              fontFamily: 'monospace'
            }}>
              {formatNormal(collisionNormal)}
            </div>
          </div>
        </div>
      </div>

      <div style={{
        height: 1,
        background: '#2a2a3e'
      }} />

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }}>
        <div style={{
          fontSize: 11,
          color: '#888888',
          textTransform: 'uppercase',
          letterSpacing: 0.5
        }}>
          场景统计
        </div>

        <div style={{
          background: '#161622',
          borderRadius: 6,
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 8
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 12,
            color: '#cccccc'
          }}>
            <span>地形块</span>
            <span style={{ color: '#3a3a5e', fontWeight: 600 }}>{terrainCount}</span>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 12,
            color: '#cccccc'
          }}>
            <span>实体数量</span>
            <span style={{ color: '#4a90d9', fontWeight: 600 }}>{entityCount}</span>
          </div>
        </div>
      </div>

      <div style={{
        height: 1,
        background: '#2a2a3e'
      }} />

      <div style={{
        fontSize: 10,
        color: '#555555',
        lineHeight: 1.6
      }}>
        <div style={{ fontWeight: 600, color: '#666666', marginBottom: 6 }}>物理参数</div>
        <div>重力: 980 px/s²</div>
        <div>移动速度: 300 px/s</div>
        <div>跳跃初速: 500 px/s</div>
        <div>敌人速度: 80 px/s</div>
        <div>网格间距: 32 px</div>
      </div>
    </div>
  );
};

export default InfoPanel;

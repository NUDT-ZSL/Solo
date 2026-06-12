import { useState, useEffect } from 'react';
import { AircraftState, WindNode, Vector2D, radToDeg } from '../utils/physics';
import { getWindColor } from '../utils/windField';

interface Config {
  _id: string;
  name: string;
  nodes: WindNode[];
  aircraftStart: { x: number; y: number; angle: number };
  createdAt: number;
}

interface ControlPanelProps {
  aircraftState: AircraftState;
  windForce: Vector2D;
  selectedNode: WindNode | null;
  nodes: WindNode[];
  onAddNode: (node: Omit<WindNode, 'id'>) => void;
  onDeleteNode: (id: string) => void;
  onReset: () => void;
  onLoadConfig: (config: Config) => void;
  onUpdateNode: (id: string, updates: Partial<WindNode>) => void;
}

function ControlPanel({
  aircraftState,
  windForce,
  selectedNode,
  nodes,
  onAddNode,
  onDeleteNode,
  onReset,
  onLoadConfig,
  onUpdateNode,
}: ControlPanelProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [configs, setConfigs] = useState<Config[]>([]);
  const [configName, setConfigName] = useState('');

  const [newNodeX, setNewNodeX] = useState(400);
  const [newNodeY, setNewNodeY] = useState(300);
  const [newNodeRadius, setNewNodeRadius] = useState(80);
  const [newNodeDirection, setNewNodeDirection] = useState(0);
  const [newNodeStrength, setNewNodeStrength] = useState(2);

  useEffect(() => {
    if (showLoadModal) {
      fetchConfigs();
    }
  }, [showLoadModal]);

  const fetchConfigs = async () => {
    try {
      const res = await fetch('/api/configs');
      const data = await res.json();
      setConfigs(data);
    } catch (err) {
      console.error('Failed to fetch configs:', err);
    }
  };

  const handleSaveConfig = async () => {
    try {
      const res = await fetch('/api/configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: configName || `Config_${Date.now()}`,
          nodes: nodes,
          aircraftStart: {
            x: aircraftState.position.x,
            y: aircraftState.position.y,
            angle: aircraftState.angle,
          },
        }),
      });
      if (res.ok) {
        setShowSaveModal(false);
        setConfigName('');
      }
    } catch (err) {
      console.error('Failed to save config:', err);
    }
  };

  const handleLoadConfig = (config: Config) => {
    onLoadConfig(config);
    setShowLoadModal(false);
  };

  const handleDeleteConfig = async (id: string) => {
    try {
      const res = await fetch(`/api/configs/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchConfigs();
      }
    } catch (err) {
      console.error('Failed to delete config:', err);
    }
  };

  const handleAddNode = () => {
    onAddNode({
      position: { x: newNodeX, y: newNodeY },
      radius: newNodeRadius,
      direction: (newNodeDirection * Math.PI) / 180,
      strength: newNodeStrength,
    });
    setShowAddModal(false);
  };

  const modalStyle = {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    animation: 'fadeIn 0.2s ease-out',
  };

  const modalContentStyle = {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    padding: '24px',
    width: '360px',
    color: '#e2e8f0',
    animation: 'scaleIn 0.2s ease-out',
  };

  const buttonStyle = {
    padding: '10px 16px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.2s ease',
  };

  return (
    <div
      style={{
        width: 220,
        minWidth: 220,
        backgroundColor: '#1e293b',
        color: '#e2e8f0',
        padding: 16,
        overflowY: 'auto' as const,
        height: '100%',
      }}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        input[type="range"] {
          width: 100%;
          accent-color: #3b82f6;
        }
      `}</style>

      <h3 style={{ marginBottom: 16, fontSize: 14, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' as const }}>
        飞行器状态
      </h3>
      
      <div style={{ fontSize: 13, lineHeight: 1.8, marginBottom: 20 }}>
        <div>位置: ({aircraftState.position.x.toFixed(1)}, {aircraftState.position.y.toFixed(1)})</div>
        <div>朝向: {radToDeg(aircraftState.angle).toFixed(1)}°</div>
        <div>速度 X: {aircraftState.velocity.x.toFixed(3)} px/帧</div>
        <div>速度 Y: {aircraftState.velocity.y.toFixed(3)} px/帧</div>
        <div>推力: {aircraftState.thrust.toFixed(1)}%</div>
      </div>

      <h3 style={{ marginBottom: 12, fontSize: 14, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' as const }}>
        风场力
      </h3>
      <div style={{ fontSize: 13, lineHeight: 1.8, marginBottom: 20 }}>
        <div>风场力 X: {windForce.x.toFixed(3)}</div>
        <div>风场力 Y: {windForce.y.toFixed(3)}</div>
        <div>总强度: {Math.sqrt(windForce.x * windForce.x + windForce.y * windForce.y).toFixed(3)}</div>
      </div>

      <h3 style={{ marginBottom: 12, fontSize: 14, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' as const }}>
        控制
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8, marginBottom: 20 }}>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            ...buttonStyle,
            backgroundColor: '#3b82f6',
            color: 'white',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#3b82f6')}
        >
          添加风力节点
        </button>
        <button
          onClick={onReset}
          style={{
            ...buttonStyle,
            backgroundColor: '#64748b',
            color: 'white',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#475569')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#64748b')}
        >
          重置飞行器
        </button>
      </div>

      <h3 style={{ marginBottom: 12, fontSize: 14, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' as const }}>
        配置
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
        <button
          onClick={() => setShowSaveModal(true)}
          style={{
            ...buttonStyle,
            backgroundColor: '#10b981',
            color: 'white',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#059669')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#10b981')}
        >
          保存配置
        </button>
        <button
          onClick={() => setShowLoadModal(true)}
          style={{
            ...buttonStyle,
            backgroundColor: '#8b5cf6',
            color: 'white',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#7c3aed')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#8b5cf6')}
        >
          加载配置
        </button>
      </div>

      {selectedNode && (
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #334155' }}>
          <h3 style={{ marginBottom: 12, fontSize: 14, fontWeight: 600, color: '#facc15' }}>
            选中节点
          </h3>
          <div style={{ fontSize: 12, lineHeight: 1.8, marginBottom: 12 }}>
            <div>位置: ({selectedNode.position.x.toFixed(0)}, {selectedNode.position.y.toFixed(0)})</div>
            <div>半径: {selectedNode.radius}px</div>
            <div>风向: {radToDeg(selectedNode.direction).toFixed(0)}°</div>
            <div style={{ color: getWindColor(selectedNode.strength) }}>
              强度: {selectedNode.strength.toFixed(2)}
            </div>
          </div>

          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>
              半径: {selectedNode.radius}px
            </label>
            <input
              type="range"
              min="40"
              max="120"
              value={selectedNode.radius}
              onChange={(e) => onUpdateNode(selectedNode.id, { radius: Number(e.target.value) })}
            />
          </div>

          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>
              风向: {radToDeg(selectedNode.direction).toFixed(0)}°
            </label>
            <input
              type="range"
              min="0"
              max="360"
              value={radToDeg(selectedNode.direction)}
              onChange={(e) => onUpdateNode(selectedNode.id, { direction: (Number(e.target.value) * Math.PI) / 180 })}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>
              强度: {selectedNode.strength.toFixed(2)}
            </label>
            <input
              type="range"
              min="0.5"
              max="5"
              step="0.1"
              value={selectedNode.strength}
              onChange={(e) => onUpdateNode(selectedNode.id, { strength: Number(e.target.value) })}
            />
          </div>

          <button
            onClick={() => onDeleteNode(selectedNode.id)}
            style={{
              ...buttonStyle,
              width: '100%',
              backgroundColor: '#ef4444',
              color: 'white',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#dc2626')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ef4444')}
          >
            删除节点
          </button>
        </div>
      )}

      {showAddModal && (
        <div style={modalStyle} onClick={() => setShowAddModal(false)}>
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 16, fontSize: 18 }}>添加风力节点</h3>
            
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 13, color: '#94a3b8', display: 'block', marginBottom: 6 }}>
                X 位置: {newNodeX}
              </label>
              <input
                type="range"
                min="40"
                max="760"
                value={newNodeX}
                onChange={(e) => setNewNodeX(Number(e.target.value))}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 13, color: '#94a3b8', display: 'block', marginBottom: 6 }}>
                Y 位置: {newNodeY}
              </label>
              <input
                type="range"
                min="40"
                max="560"
                value={newNodeY}
                onChange={(e) => setNewNodeY(Number(e.target.value))}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 13, color: '#94a3b8', display: 'block', marginBottom: 6 }}>
                半径: {newNodeRadius}px
              </label>
              <input
                type="range"
                min="40"
                max="120"
                value={newNodeRadius}
                onChange={(e) => setNewNodeRadius(Number(e.target.value))}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 13, color: '#94a3b8', display: 'block', marginBottom: 6 }}>
                风向: {newNodeDirection}°
              </label>
              <input
                type="range"
                min="0"
                max="360"
                value={newNodeDirection}
                onChange={(e) => setNewNodeDirection(Number(e.target.value))}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, color: '#94a3b8', display: 'block', marginBottom: 6 }}>
                强度: {newNodeStrength.toFixed(1)}
              </label>
              <input
                type="range"
                min="0.5"
                max="5"
                step="0.1"
                value={newNodeStrength}
                onChange={(e) => setNewNodeStrength(Number(e.target.value))}
              />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ ...buttonStyle, flex: 1, backgroundColor: '#64748b', color: 'white' }}
              >
                取消
              </button>
              <button
                onClick={handleAddNode}
                style={{ ...buttonStyle, flex: 1, backgroundColor: '#3b82f6', color: 'white' }}
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}

      {showSaveModal && (
        <div style={modalStyle} onClick={() => setShowSaveModal(false)}>
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 16, fontSize: 18 }}>保存配置</h3>
            
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, color: '#94a3b8', display: 'block', marginBottom: 6 }}>
                配置名称
              </label>
              <input
                type="text"
                value={configName}
                onChange={(e) => setConfigName(e.target.value)}
                placeholder="留空使用时间戳"
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #334155',
                  backgroundColor: '#0f172a',
                  color: '#e2e8f0',
                  fontSize: 14,
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setShowSaveModal(false)}
                style={{ ...buttonStyle, flex: 1, backgroundColor: '#64748b', color: 'white' }}
              >
                取消
              </button>
              <button
                onClick={handleSaveConfig}
                style={{ ...buttonStyle, flex: 1, backgroundColor: '#10b981', color: 'white' }}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {showLoadModal && (
        <div style={modalStyle} onClick={() => setShowLoadModal(false)}>
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 16, fontSize: 18 }}>加载配置</h3>
            
            <div style={{ maxHeight: 300, overflowY: 'auto' as const, marginBottom: 16 }}>
              {configs.length === 0 ? (
                <div style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', padding: 20 }}>
                  暂无保存的配置
                </div>
              ) : (
                configs.map((config) => (
                  <div
                    key={config._id}
                    style={{
                      padding: 12,
                      backgroundColor: '#0f172a',
                      borderRadius: '6px',
                      marginBottom: 8,
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'background-color 0.2s',
                    }}
                    onClick={() => handleLoadConfig(config)}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1e3a5f')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#0f172a')}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{config.name}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>
                        {new Date(config.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteConfig(config._id);
                      }}
                      style={{
                        padding: '4px 8px',
                        fontSize: 12,
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      删除
                    </button>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setShowLoadModal(false)}
              style={{ ...buttonStyle, width: '100%', backgroundColor: '#64748b', color: 'white' }}
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ControlPanel;

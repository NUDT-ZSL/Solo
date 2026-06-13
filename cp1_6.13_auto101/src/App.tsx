import { useEffect, useRef, useState, useCallback } from 'react';
import axios from 'axios';
import { SceneManager } from './SceneManager';
import { PlantState, GrowthStage } from './PlantEngine';

interface Snapshot {
  _id: string;
  height: number;
  leafCount: number;
  lightIntensity: number;
  nutrientConcentration: number;
  gravityMode: 'zero' | 'earth';
  thumbnail: string;
  stage: GrowthStage;
  timestamp: number;
}

const STAGE_NAMES: Record<GrowthStage, string> = {
  germination: '萌发期',
  seedling: '幼苗期',
  growing: '成长期',
  mature: '成熟期',
  flowering: '开花期'
};

function App() {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  const [lightIntensity, setLightIntensity] = useState(500);
  const [nutrientConcentration, setNutrientConcentration] = useState(0.5);
  const [gravityMode, setGravityMode] = useState<'zero' | 'earth'>('zero');
  
  const [plantState, setPlantState] = useState<PlantState | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [isGrowthPlaying, setIsGrowthPlaying] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  const fetchSnapshots = useCallback(async () => {
    try {
      const response = await axios.get('/api/snapshots');
      setSnapshots(response.data);
    } catch (error) {
      console.error('Failed to fetch snapshots:', error);
    }
  }, []);

  useEffect(() => {
    if (!canvasContainerRef.current) return;
    
    const sceneManager = new SceneManager(canvasContainerRef.current);
    sceneManagerRef.current = sceneManager;
    
    sceneManager.setEnvironmentParams({
      lightIntensity,
      nutrientConcentration,
      gravityMode
    });
    
    fetchSnapshots();
    
    const updateState = () => {
      const state = sceneManager.getPlantState();
      setPlantState(state);
      
      const playing = sceneManager.isGrowthPlaying();
      if (playing !== isGrowthPlaying) {
        setIsGrowthPlaying(playing);
        if (!playing && isGrowthPlaying) {
          setShowCompleteModal(true);
          handleSaveSnapshot();
        }
      }
      
      animationFrameRef.current = requestAnimationFrame(updateState);
    };
    animationFrameRef.current = requestAnimationFrame(updateState);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      sceneManager.dispose();
    };
  }, []);

  useEffect(() => {
    if (!sceneManagerRef.current) return;
    
    sceneManagerRef.current.setEnvironmentParams({
      lightIntensity,
      nutrientConcentration,
      gravityMode
    });
  }, [lightIntensity, nutrientConcentration, gravityMode]);

  const handleLightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLightIntensity(Number(e.target.value));
  };

  const handleNutrientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNutrientConcentration(Number(e.target.value));
  };

  const handleGravityToggle = () => {
    setGravityMode(prev => prev === 'zero' ? 'earth' : 'zero');
  };

  const handleSaveSnapshot = useCallback(async () => {
    if (!sceneManagerRef.current || !plantState) return;
    
    try {
      const thumbnail = sceneManagerRef.current.captureThumbnail(64, 64);
      const envParams = sceneManagerRef.current.getEnvironmentParams();
      
      const response = await axios.post('/api/snapshots', {
        height: plantState.height,
        leafCount: plantState.leafCount,
        lightIntensity: envParams.lightIntensity,
        nutrientConcentration: envParams.nutrientConcentration,
        gravityMode: envParams.gravityMode,
        thumbnail,
        stage: plantState.stage
      });
      
      setSnapshots(prev => [response.data, ...prev]);
    } catch (error) {
      console.error('Failed to save snapshot:', error);
    }
  }, [plantState]);

  const handleLoadSnapshot = useCallback((snapshot: Snapshot) => {
    if (!sceneManagerRef.current) return;
    
    sceneManagerRef.current.setPlantState({
      height: snapshot.height,
      leafCount: snapshot.leafCount,
      stage: snapshot.stage
    }, 2);
    
    setLightIntensity(snapshot.lightIntensity);
    setNutrientConcentration(snapshot.nutrientConcentration);
    setGravityMode(snapshot.gravityMode);
  }, []);

  const handlePlayGrowth = () => {
    if (!sceneManagerRef.current) return;
    
    sceneManagerRef.current.startGrowthPlayback();
    setIsGrowthPlaying(true);
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatNumber = (num: number, decimals: number = 2): string => {
    return num.toFixed(decimals);
  };

  return (
    <div style={styles.container}>
      <div ref={canvasContainerRef} style={styles.canvasContainer} />
      
      <div style={styles.leftPanel}>
        <div style={styles.panelHeader}>
          <span style={styles.panelTitle}>历史快照</span>
          <span style={styles.panelSubtitle}>{snapshots.length} 条记录</span>
        </div>
        
        <div style={styles.snapshotList}>
          {snapshots.length === 0 ? (
            <div style={styles.emptyState}>
              <span style={styles.emptyText}>暂无快照</span>
              <span style={styles.emptyHint}>点击"记录快照"保存当前状态</span>
            </div>
          ) : (
            snapshots.map(snapshot => (
              <div
                key={snapshot._id}
                style={styles.snapshotCard}
                onClick={() => handleLoadSnapshot(snapshot)}
              >
                <div style={styles.snapshotThumb}>
                  <img 
                    src={snapshot.thumbnail} 
                    alt="快照" 
                    style={styles.thumbImage}
                  />
                </div>
                <div style={styles.snapshotInfo}>
                  <div style={styles.snapshotDate}>
                    {formatDate(snapshot.timestamp)}
                  </div>
                  <div style={styles.snapshotStage}>
                    {STAGE_NAMES[snapshot.stage]}
                  </div>
                  <div style={styles.snapshotParams}>
                    <span style={styles.paramTag}>
                      ☀ {snapshot.lightIntensity}
                    </span>
                    <span style={styles.paramTag}>
                      🌱 {(snapshot.nutrientConcentration * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      <div style={styles.controlPanel}>
        <div style={styles.panelHeader}>
          <span style={styles.panelTitle}>控制面板</span>
          <span style={styles.panelSubtitle}>SpaceGarden v1.0</span>
        </div>
        
        <div style={styles.divider} />
        
        <div style={styles.section}>
          <div style={styles.sectionTitle}>环境参数</div>
          
          <div style={styles.controlGroup}>
            <div style={styles.controlLabel}>
              <span>光照强度</span>
              <span style={styles.valueLabel}>{lightIntensity} lux</span>
            </div>
            <input
              type="range"
              min="0"
              max="1000"
              value={lightIntensity}
              onChange={handleLightChange}
              style={styles.slider}
              disabled={isGrowthPlaying}
            />
          </div>
          
          <div style={styles.controlGroup}>
            <div style={styles.controlLabel}>
              <span>养分浓度</span>
              <span style={styles.valueLabel}>
                {(nutrientConcentration * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={nutrientConcentration}
              onChange={handleNutrientChange}
              style={styles.slider}
              disabled={isGrowthPlaying}
            />
          </div>
          
          <div style={styles.controlGroup}>
            <div style={styles.controlLabel}>
              <span>重力模式</span>
              <span style={styles.valueLabel}>
                {gravityMode === 'zero' ? '零重力' : '地球重力'}
              </span>
            </div>
            <div 
              style={{
                ...styles.toggleSwitch,
                ...(gravityMode === 'earth' ? styles.toggleSwitchActive : {}),
              }}
              onClick={!isGrowthPlaying ? handleGravityToggle : undefined}
            >
              <div 
                style={{
                  ...styles.toggleKnob,
                  ...(gravityMode === 'earth' ? styles.toggleKnobActive : {}),
                }}
              />
            </div>
          </div>
        </div>
        
        <div style={styles.divider} />
        
        <div style={styles.section}>
          <div style={styles.sectionTitle}>植物状态</div>
          
          <div style={styles.statusGrid}>
            <div style={styles.statusItem}>
              <span style={styles.statusLabel}>生长阶段</span>
              <span style={styles.statusValue}>
                {plantState ? STAGE_NAMES[plantState.stage] : '-'}
              </span>
            </div>
            <div style={styles.statusItem}>
              <span style={styles.statusLabel}>植物高度</span>
              <span style={styles.statusValue}>
                {plantState ? formatNumber(plantState.height) : '-'} 单位
              </span>
            </div>
            <div style={styles.statusItem}>
              <span style={styles.statusLabel}>叶片数量</span>
              <span style={styles.statusValue}>
                {plantState ? plantState.leafCount : '-'} 片
              </span>
            </div>
            <div style={styles.statusItem}>
              <span style={styles.statusLabel}>花朵数量</span>
              <span style={styles.statusValue}>
                {plantState ? plantState.flowerCount : '-'} 朵
              </span>
            </div>
          </div>
          
          {plantState?.isWilting && (
            <div style={styles.warningBox}>
              ⚠️ 植物正在枯萎！请增加光照和养分
            </div>
          )}
        </div>
        
        <div style={styles.spacer} />
        
        <button
          style={styles.primaryButton}
          onClick={handlePlayGrowth}
          disabled={isGrowthPlaying}
        >
          {isGrowthPlaying ? '生长中...' : '▶ 播放生长全程'}
        </button>
        
        <button
          style={styles.secondaryButton}
          onClick={handleSaveSnapshot}
          disabled={!plantState}
        >
          📷 记录快照
        </button>
      </div>
      
      {showCompleteModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalIcon}>🌸</div>
            <div style={styles.modalTitle}>生长完成！</div>
            <div style={styles.modalText}>
              植物已完成从萌发到开花的全过程，已自动记录快照。
            </div>
            <button
              style={styles.modalButton}
              onClick={() => setShowCompleteModal(false)}
            >
              确定
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    background: '#000000'
  },
  
  canvasContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%'
  },
  
  leftPanel: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 240,
    height: '100%',
    background: 'rgba(15, 23, 42, 0.9)',
    backdropFilter: 'blur(10px)',
    borderRight: '1px solid rgba(56, 189, 248, 0.3)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 10
  },
  
  controlPanel: {
    position: 'absolute',
    right: 20,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 280,
    background: 'rgba(15, 23, 42, 0.9)',
    backdropFilter: 'blur(10px)',
    borderRadius: 12,
    border: '1px solid rgba(56, 189, 248, 0.3)',
    boxShadow: '0 0 30px rgba(56, 189, 248, 0.1)',
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    zIndex: 10
  },
  
  panelHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    padding: '16px 20px'
  },
  
  panelTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#f1f5f9'
  },
  
  panelSubtitle: {
    fontSize: 12,
    color: '#64748b'
  },
  
  divider: {
    height: 1,
    background: 'rgba(56, 189, 248, 0.2)',
    margin: '8px 0'
  },
  
  section: {
    padding: '12px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: 16
  },
  
  sectionTitle: {
    fontSize: 13,
    fontWeight: 500,
    color: '#38bdf8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4
  },
  
  controlGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8
  },
  
  controlLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 13,
    color: '#cbd5e1'
  },
  
  valueLabel: {
    fontFamily: 'monospace',
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: 500
  },
  
  slider: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    background: '#1e293b',
    outline: 'none',
    WebkitAppearance: 'none',
    cursor: 'pointer'
  },
  
  toggleSwitch: {
    width: 52,
    height: 28,
    borderRadius: 14,
    background: '#1e293b',
    position: 'relative',
    cursor: 'pointer',
    transition: 'background 0.3s ease',
    border: '1px solid rgba(56, 189, 248, 0.3)'
  },
  
  toggleSwitchActive: {
    background: '#38bdf8'
  },
  
  toggleKnob: {
    position: 'absolute',
    top: 3,
    left: 3,
    width: 20,
    height: 20,
    borderRadius: '50%',
    background: '#f8fafc',
    transition: 'transform 0.3s ease',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
  },
  
  toggleKnobActive: {
    transform: 'translateX(24px)'
  },
  
  statusGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12
  },
  
  statusItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    padding: '10px 12px',
    background: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 8,
    border: '1px solid rgba(56, 189, 248, 0.1)'
  },
  
  statusLabel: {
    fontSize: 11,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  
  statusValue: {
    fontFamily: 'monospace',
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: 600
  },
  
  warningBox: {
    padding: '10px 12px',
    background: 'rgba(251, 146, 60, 0.15)',
    border: '1px solid rgba(251, 146, 60, 0.3)',
    borderRadius: 8,
    fontSize: 12,
    color: '#fb923c',
    textAlign: 'center'
  },
  
  spacer: {
    flex: 1
  },
  
  primaryButton: {
    width: '100%',
    padding: '12px 16px',
    background: '#38bdf8',
    color: '#0f172a',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginBottom: 10
  },
  
  secondaryButton: {
    width: '100%',
    padding: '12px 16px',
    background: '#1e293b',
    color: '#38bdf8',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  
  snapshotList: {
    flex: 1,
    overflowY: 'auto',
    padding: '0 16px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12
  },
  
  snapshotCard: {
    width: 220,
    height: 140,
    background: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 8,
    border: '1px solid rgba(56, 189, 248, 0.2)',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    flexDirection: 'column'
  },
  
  snapshotThumb: {
    width: '100%',
    height: 70,
    background: '#000',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  
  thumbImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  
  snapshotInfo: {
    padding: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    flex: 1
  },
  
  snapshotDate: {
    fontSize: 12,
    color: '#94a3b8',
    fontFamily: 'monospace'
  },
  
  snapshotStage: {
    fontSize: 13,
    fontWeight: 500,
    color: '#f1f5f9'
  },
  
  snapshotParams: {
    display: 'flex',
    gap: 8,
    marginTop: 'auto'
  },
  
  paramTag: {
    fontSize: 10,
    padding: '2px 6px',
    background: 'rgba(56, 189, 248, 0.15)',
    color: '#38bdf8',
    borderRadius: 4,
    fontFamily: 'monospace'
  },
  
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    gap: 8
  },
  
  emptyText: {
    fontSize: 14,
    color: '#64748b'
  },
  
  emptyHint: {
    fontSize: 12,
    color: '#475569',
    textAlign: 'center'
  },
  
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100
  },
  
  modalContent: {
    background: '#0f172a',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    borderRadius: 16,
    padding: 32,
    maxWidth: 320,
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16
  },
  
  modalIcon: {
    fontSize: 48
  },
  
  modalTitle: {
    fontSize: 20,
    fontWeight: 600,
    color: '#f1f5f9'
  },
  
  modalText: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 1.6
  },
  
  modalButton: {
    padding: '12px 32px',
    background: '#38bdf8',
    color: '#0f172a',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 8
  }
};

export default App;

import React, { useState, useCallback, useEffect } from 'react';
import EditorPanel from './editor/EditorPanel';
import SceneCanvas from './scene/SceneCanvas';
import { BulletConfig, EnemyConfig, HitRecord, PerformanceStats } from './types';

const DEFAULT_BULLET_CONFIG: BulletConfig = {
  type: 'normal',
  bulletSize: 4,
  bulletColor: '#FF5555',
};

const DEFAULT_ENEMY_CONFIG: EnemyConfig = {
  hitReaction: 'knockback',
  health: 3,
};

const App: React.FC = () => {
  const [bulletConfig, setBulletConfig] = useState<BulletConfig>(DEFAULT_BULLET_CONFIG);
  const [enemyConfig, setEnemyConfig] = useState<EnemyConfig>(DEFAULT_ENEMY_CONFIG);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [editorCollapsed, setEditorCollapsed] = useState<boolean>(true);
  const [stats, setStats] = useState<PerformanceStats>({
    fps: 60,
    hitRate: 0,
    enemyCount: 5,
  });

  useEffect(() => {
    const checkWidth = () => {
      const mobile = window.innerWidth < 900;
      setIsMobile(mobile);
      if (!mobile) {
        setEditorCollapsed(false);
      }
    };

    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  const handleApply = useCallback((bullet: BulletConfig, enemy: EnemyConfig) => {
    setBulletConfig({ ...bullet });
    setEnemyConfig({ ...enemy });
  }, []);

  const handleStatsUpdate = useCallback((fps: number, hitRate: number, enemyCount: number) => {
    setStats({ fps, hitRate, enemyCount });
  }, []);

  const handleHitRecord = useCallback((_record: HitRecord) => {
  }, []);

  const handleToggleCollapse = useCallback(() => {
    setEditorCollapsed((prev) => !prev);
  }, []);

  if (isMobile) {
    return (
      <div style={styles.mobileContainer}>
        {!editorCollapsed && (
          <EditorPanel
            bulletConfig={bulletConfig}
            enemyConfig={enemyConfig}
            onApply={handleApply}
            collapsed={false}
          />
        )}
        <div style={styles.mobileSceneContainer}>
          {editorCollapsed && (
            <button
              onClick={handleToggleCollapse}
              style={styles.collapseButton}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.background = '#FF8C00';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.background = '#FF6B35';
              }}
            >
              ⚙ 配置
            </button>
          )}
          <SceneCanvas
            bulletConfig={bulletConfig}
            enemyConfig={enemyConfig}
            onStatsUpdate={handleStatsUpdate}
            onHitRecord={handleHitRecord}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={styles.desktopContainer}>
      <EditorPanel
        bulletConfig={bulletConfig}
        enemyConfig={enemyConfig}
        onApply={handleApply}
      />
      <div style={styles.sceneContainer}>
        <SceneCanvas
          bulletConfig={bulletConfig}
          enemyConfig={enemyConfig}
          onStatsUpdate={handleStatsUpdate}
          onHitRecord={handleHitRecord}
        />
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  desktopContainer: {
    display: 'flex',
    width: '100vw',
    height: '100vh',
    background: '#1A1A1A',
    gap: '12px',
    padding: '12px',
    boxSizing: 'border-box',
    overflow: 'hidden',
  },
  sceneContainer: {
    flex: 1,
    minHeight: '600px',
    position: 'relative',
  },
  mobileContainer: {
    display: 'flex',
    flexDirection: 'column',
    width: '100vw',
    height: '100vh',
    background: '#1A1A1A',
    boxSizing: 'border-box',
    overflow: 'hidden',
  },
  mobileSceneContainer: {
    flex: 1,
    position: 'relative',
    minHeight: '400px',
  },
  collapseButton: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    zIndex: 10,
    background: '#FF6B35',
    color: '#FFF',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 14px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s ease',
  },
};

export default App;

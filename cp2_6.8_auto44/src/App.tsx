import React, { useState, useEffect, useCallback, useRef } from 'react';
import PathEditor from './PathEditor';
import AnimationController from './AnimationController';
import { PathPoint, AnimationParams, HistoryState, ExportConfig } from './types';
import {
  createHistoryStore,
  pushState,
  goToState,
  getHistoryList,
  getCurrentState,
  canUndo,
  canRedo,
  undo,
  redo,
  HistoryStore
} from './historyManager';
import {
  getDefaultPath,
  getMorphTargetPath,
  generateSVGString,
  calculatePathLength
} from './utils/pathUtils';
import { formatTime, downloadFile } from './utils/animationUtils';

const defaultAnimationParams: AnimationParams = {
  type: 'stroke',
  duration: 2,
  easing: 'ease-in-out',
  isPlaying: false,
  progress: 0
};

const App: React.FC = () => {
  const [pathPoints, setPathPoints] = useState<PathPoint[]>(getDefaultPath());
  const [morphTargetPoints, setMorphTargetPoints] = useState<PathPoint[] | undefined>(getMorphTargetPath());
  const [animationParams, setAnimationParams] = useState<AnimationParams>(defaultAnimationParams);
  const [historyStore, setHistoryStore] = useState<HistoryStore>(() => {
    let store = createHistoryStore();
    store = pushState(store, '初始化默认路径', getDefaultPath(), defaultAnimationParams, getMorphTargetPath());
    return store;
  });
  const [transitioning, setTransitioning] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const animationFrameRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  const pushToHistory = useCallback((label: string) => {
    setHistoryStore(prev => pushState(prev, label, pathPoints, animationParams, morphTargetPoints));
  }, [pathPoints, animationParams, morphTargetPoints]);

  const handleImportPath = useCallback((points: PathPoint[]) => {
    setPathPoints(points);
    setAnimationParams(prev => ({ ...prev, isPlaying: false, progress: 0 }));
    setTimeout(() => {
      setHistoryStore(prev => pushState(prev, `导入路径 (${points.length}个点)`, points, animationParams, morphTargetPoints));
    }, 0);
  }, [animationParams, morphTargetPoints]);

  const handleImportMorphTarget = useCallback((points: PathPoint[]) => {
    setMorphTargetPoints(points);
    setTimeout(() => {
      setHistoryStore(prev => pushState(prev, `导入变形目标 (${points.length}个点)`, pathPoints, animationParams, points));
    }, 0);
  }, [pathPoints, animationParams]);

  const handleAnimationChange = useCallback((changes: Partial<AnimationParams>) => {
    setAnimationParams(prev => {
      const next = { ...prev, ...changes };
      const keys = Object.keys(changes);
      const shouldPushHistory = keys.some(k => ['type', 'easing', 'duration'].includes(k));
      if (shouldPushHistory) {
        setTimeout(() => {
          setHistoryStore(s => {
            const stateLabels: Record<string, string> = {
              type: `切换动画类型: ${next.type === 'stroke' ? '描边' : '变形'}`,
              easing: `切换缓动: ${next.easing}`,
              duration: `设置时长: ${next.duration.toFixed(1)}s`
            };
            const label = keys.map(k => stateLabels[k] || '修改动画设置').join(', ');
            return pushState(s, label, pathPoints, next, morphTargetPoints);
          });
        }, 0);
      }
      return next;
    });
  }, [pathPoints, morphTargetPoints]);

  const handlePathEditStart = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handlePathEditEnd = useCallback(() => {
    setIsEditing(false);
    setTimeout(() => {
      pushToHistory('编辑锚点');
    }, 0);
  }, [pushToHistory]);

  const handlePathChange = useCallback((points: PathPoint[]) => {
    setPathPoints(points);
  }, []);

  const handleGoToHistory = useCallback((targetIndex: number) => {
    const result = goToState(historyStore, targetIndex);
    if (!result) return;

    setTransitioning(true);
    setTimeout(() => {
      const state = result.states[result.currentIndex];
      if (state) {
        setPathPoints(state.pathPoints);
        setAnimationParams(state.animationParams);
        setMorphTargetPoints(state.morphTargetPoints);
      }
      setHistoryStore(result);
      setTimeout(() => setTransitioning(false), 300);
    }, 100);
  }, [historyStore]);

  const handleUndo = useCallback(() => {
    const result = undo(historyStore);
    if (!result) return;
    setTransitioning(true);
    setTimeout(() => {
      const state = result.states[result.currentIndex];
      if (state) {
        setPathPoints(state.pathPoints);
        setAnimationParams(state.animationParams);
        setMorphTargetPoints(state.morphTargetPoints);
      }
      setHistoryStore(result);
      setTimeout(() => setTransitioning(false), 300);
    }, 50);
  }, [historyStore]);

  const handleRedo = useCallback(() => {
    const result = redo(historyStore);
    if (!result) return;
    setTransitioning(true);
    setTimeout(() => {
      const state = result.states[result.currentIndex];
      if (state) {
        setPathPoints(state.pathPoints);
        setAnimationParams(state.animationParams);
        setMorphTargetPoints(state.morphTargetPoints);
      }
      setHistoryStore(result);
      setTimeout(() => setTransitioning(false), 300);
    }, 50);
  }, [historyStore]);

  const handleExportSVG = useCallback(() => {
    const svgContent = generateSVGString(pathPoints);
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    downloadFile(`path-${timestamp}.svg`, svgContent, 'image/svg+xml');
  }, [pathPoints]);

  const handleExportConfig = useCallback(() => {
    const config: ExportConfig = {
      animation: animationParams,
      pathLength: calculatePathLength(pathPoints),
      createdAt: new Date().toISOString()
    };
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    downloadFile(`animation-config-${timestamp}.json`, JSON.stringify(config, null, 2), 'application/json');
  }, [pathPoints, animationParams]);

  useEffect(() => {
    if (!animationParams.isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      lastTimeRef.current = 0;
      return;
    }

    const animate = (time: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = time;
      }

      const delta = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      setAnimationParams(prev => {
        if (!prev.isPlaying) return prev;
        let nextProgress = prev.progress + delta / prev.duration;
        let isPlaying = true;

        if (nextProgress >= 1) {
          nextProgress = 0;
        }

        return { ...prev, progress: nextProgress, isPlaying };
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [animationParams.isPlaying, animationParams.duration]);

  const historyList = getHistoryList(historyStore);
  const currentState = getCurrentState(historyStore);

  return (
    <div className="app-container">
      <div className="panel-left">
        <AnimationController
          animationParams={animationParams}
          pathPoints={pathPoints}
          morphTargetPoints={morphTargetPoints}
          onAnimationChange={handleAnimationChange}
          onImportPath={handleImportPath}
          onImportMorphTarget={handleImportMorphTarget}
          onExportSVG={handleExportSVG}
          onExportConfig={handleExportConfig}
        />
      </div>

      <div className="panel-center">
        <div className={transitioning ? 'fade-transition' : ''} style={{ width: '100%' }}>
          <PathEditor
            pathPoints={pathPoints}
            morphTargetPoints={morphTargetPoints}
            animationParams={animationParams}
            onChange={handlePathChange}
            onEditStart={handlePathEditStart}
            onEditEnd={handlePathEditEnd}
          />
        </div>
        <div style={{
          marginTop: '16px',
          color: '#707080',
          fontSize: '12px',
          textAlign: 'center'
        }}>
          {isEditing ? '🔴 正在编辑路径...' : '💡 提示：拖动路径上的红色圆点可编辑锚点，拖动橙色圆点可调整贝塞尔曲线控制点'}
        </div>
      </div>

      <div className="panel-right">
        <h2 className="panel-title">历史记录</h2>

        <div className="btn-group" style={{ marginBottom: '16px' }}>
          <button
            className="btn btn-secondary btn-small"
            style={{ flex: 1 }}
            onClick={handleUndo}
            disabled={!canUndo(historyStore)}
          >
            ← 撤销
          </button>
          <button
            className="btn btn-secondary btn-small"
            style={{ flex: 1 }}
            onClick={handleRedo}
            disabled={!canRedo(historyStore)}
          >
            重做 →
          </button>
        </div>

        {historyList.length === 0 ? (
          <div className="empty-state">暂无历史记录</div>
        ) : (
          <ul className="history-list" style={{ listStyle: 'none' }}>
            {[...historyList].reverse().map((state: HistoryState) => {
              const isActive = currentState?.id === state.id;
              const actualIndex = historyList.findIndex(s => s.id === state.id);
              return (
                <li
                  key={state.id}
                  className={`history-item ${isActive ? 'active' : ''}`}
                  onClick={() => handleGoToHistory(actualIndex)}
                >
                  <div className="history-item-index">
                    步骤 #{actualIndex + 1}
                    {isActive && ' ◀ 当前'}
                  </div>
                  <div className="history-item-label">{state.label}</div>
                  <div className="history-item-time">
                    {formatTime(state.timestamp)} · {state.pathPoints.length} 个点
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div style={{
          marginTop: '20px',
          padding: '12px',
          background: '#1a1a2e',
          borderRadius: '6px',
          borderLeft: '3px solid #0f3460'
        }}>
          <div style={{ color: '#a0a0b0', fontSize: '11px', marginBottom: '4px' }}>
            历史记录上限
          </div>
          <div style={{ color: '#ffffff', fontSize: '14px', fontWeight: 600 }}>
            {historyList.length} / 20
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
